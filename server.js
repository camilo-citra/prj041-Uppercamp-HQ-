import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './src/db/index.js';
import { ingestAllMeetings } from './src/services/ingestionService.js';
import { answerRAGQuery } from './src/rag/ragOrchestrator.js';
import { syncDbToRaw } from './scripts/sync_db_to_raw.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ingest trigger endpoint
app.post('/api/ingest', (req, res) => {
  try {
    const rawDir = path.join(__dirname, 'Raw');
    ingestAllMeetings(rawDir);
    res.json({ success: true, message: 'Ingestion completed successfully.' });
  } catch (error) {
    console.error('Ingestion failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload & Process New Meeting Summary Endpoint
app.post('/api/meetings/upload', (req, res) => {
  try {
    const { filename, content } = req.body;
    if (!filename || !content) {
      return res.status(400).json({ error: 'Filename and content are required.' });
    }

    let safeFilename = filename.trim();
    if (!safeFilename.endsWith('.md')) safeFilename += '.md';

    const rawDir = path.join(__dirname, 'Raw');
    const targetPath = path.join(rawDir, safeFilename);

    // Save markdown file directly into Raw/ folder
    fs.writeFileSync(targetPath, content, 'utf8');

    // Trigger full ingestion pipeline (Parses markdown, updates DB & indexes RAG vector chunks)
    ingestAllMeetings(rawDir);

    const idMatch = safeFilename.match(/Minutes\d+/i);
    const meetingId = idMatch ? idMatch[0] : safeFilename.replace(/\.md$/, '');

    res.json({
      success: true,
      message: `Successfully saved ${safeFilename} to Raw/ and ingested into RAG vector store & database.`,
      filename: safeFilename,
      meeting_id: meetingId
    });
  } catch (error) {
    console.error('Upload processing failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Meetings endpoints
app.get('/api/meetings', (req, res) => {
  const meetings = db.prepare(`
    SELECT id, title, date, time, location, pm, attendees, apologies, raw_file_name, gemini_link, executive_summary
    FROM meeting_metadata
    ORDER BY date ASC
  `).all();
  res.json(meetings);
});

app.get('/api/meetings/:id', (req, res) => {
  const meeting = db.prepare(`SELECT * FROM meeting_metadata WHERE id = ?`).get(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  const decisions = db.prepare(`SELECT * FROM decisions_taken WHERE meeting_id = ? ORDER BY decision_num ASC`).all(req.params.id);
  const actions = db.prepare(`SELECT * FROM action_items WHERE meeting_id = ? ORDER BY item_num ASC`).all(req.params.id);
  const risks = db.prepare(`SELECT * FROM risk_raised WHERE meeting_id = ?`).all(req.params.id);
  const assumptions = db.prepare(`SELECT * FROM assumptions WHERE updated_meeting_id = ?`).all(req.params.id);
  const dependencies = db.prepare(`SELECT * FROM dependencies WHERE meeting_id = ?`).all(req.params.id);
  const chunks = db.prepare(`SELECT subject, section_type, content FROM vector_chunks WHERE meeting_id = ?`).all(req.params.id);

  res.json({
    ...meeting,
    decisions,
    actions,
    risks,
    assumptions,
    dependencies,
    chunks
  });
});

app.delete('/api/meetings/:id', (req, res) => {
  try {
    const meeting = db.prepare(`SELECT * FROM meeting_metadata WHERE id = ?`).get(req.params.id);
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

    const rawDir = path.join(__dirname, 'Raw');
    if (meeting.raw_file_name) {
      const filePath = path.join(rawDir, meeting.raw_file_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Re-run ingestion to update DB and vector store
    ingestAllMeetings(rawDir);

    res.json({ success: true, message: `Meeting ${req.params.id} deleted and database re-synced.` });
  } catch (error) {
    console.error('Delete meeting failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Action items endpoints
app.get('/api/actions', (req, res) => {
  const { status, assignee } = req.query;
  let sql = `
    SELECT a.*, m.date, m.title as meeting_title
    FROM action_items a
    JOIN meeting_metadata m ON a.meeting_id = m.id
  `;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push(`a.status = ?`);
    params.push(status);
  }
  if (assignee) {
    conditions.push(`a.assignee LIKE ?`);
    params.push(`%${assignee}%`);
  }

  if (conditions.length) {
    sql += ` WHERE ` + conditions.join(' AND ');
  }
  sql += ` ORDER BY m.date DESC, a.id ASC`;

  const items = db.prepare(sql).all(...params);
  res.json(items);
});

app.patch('/api/actions/:id', (req, res) => {
  const { description, assignee, due_date, status } = req.body;
  const current = db.prepare('SELECT * FROM action_items WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Action item not found' });

  const updatedDesc = description !== undefined ? description : current.description;
  const updatedAssignee = assignee !== undefined ? assignee : current.assignee;
  const updatedDue = due_date !== undefined ? due_date : current.due_date;
  const updatedStatus = status !== undefined ? status : current.status;

  db.prepare(`
    UPDATE action_items 
    SET description = ?, assignee = ?, due_date = ?, status = ?
    WHERE id = ?
  `).run(updatedDesc, updatedAssignee, updatedDue, updatedStatus, req.params.id);

  try { syncDbToRaw(); } catch (err) { console.error('Sync to Raw failed:', err); }

  res.json({
    success: true,
    id: req.params.id,
    description: updatedDesc,
    assignee: updatedAssignee,
    due_date: updatedDue,
    status: updatedStatus
  });
});

// Risks endpoint
app.get('/api/risks', (req, res) => {
  const risks = db.prepare(`
    SELECT r.*, m.date, m.title as meeting_title
    FROM risk_raised r
    JOIN meeting_metadata m ON r.meeting_id = m.id
    ORDER BY 
      CASE impact_level WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
      CASE likelihood WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END
  `).all();
  res.json(risks);
});

app.patch('/api/risks/:id', (req, res) => {
  const { risk_code, description, contingency_measure, impact_level, likelihood, status } = req.body;
  const current = db.prepare('SELECT * FROM risk_raised WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Risk not found' });

  const updatedCode = risk_code !== undefined ? risk_code : (current.risk_code || `RSK-${String(current.id).padStart(3, '0')}`);
  const updatedDesc = description !== undefined ? description : current.description;
  const updatedCont = contingency_measure !== undefined ? contingency_measure : current.contingency_measure;
  const updatedImpact = impact_level !== undefined ? impact_level : current.impact_level;
  const updatedLikelihood = likelihood !== undefined ? likelihood : current.likelihood;
  const updatedStatus = status !== undefined ? status : (current.status || 'Open');

  db.prepare(`
    UPDATE risk_raised 
    SET risk_code = ?, description = ?, contingency_measure = ?, impact_level = ?, likelihood = ?, status = ?
    WHERE id = ?
  `).run(updatedCode, updatedDesc, updatedCont, updatedImpact, updatedLikelihood, updatedStatus, req.params.id);

  try { syncDbToRaw(); } catch (err) { console.error('Sync to Raw failed:', err); }

  res.json({
    success: true,
    id: req.params.id,
    risk_code: updatedCode,
    description: updatedDesc,
    contingency_measure: updatedCont,
    impact_level: updatedImpact,
    likelihood: updatedLikelihood,
    status: updatedStatus
  });
});

// Stakeholders & Team Directory Endpoint
app.get('/api/stakeholders', (req, res) => {
  const stakeholders = db.prepare(`SELECT * FROM stakeholders ORDER BY id ASC`).all();
  const meetingList = db.prepare(`SELECT id, attendees FROM meeting_metadata`).all();
  const actionList = db.prepare(`SELECT assignee FROM action_items`).all();

  const enriched = stakeholders.map(s => {
    const meetingsAttended = meetingList.filter(m =>
      m.attendees && m.attendees.toLowerCase().includes(s.name.toLowerCase())
    ).length;

    const actionsAssigned = actionList.filter(a =>
      a.assignee && a.assignee.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
    ).length;

    return {
      ...s,
      meetings_attended: meetingsAttended,
      actions_assigned: actionsAssigned
    };
  });

  res.json(enriched);
});

// Update stakeholder details
app.put('/api/stakeholders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, organization, key_responsibilities, status } = req.body;

    if (!name || !role || !organization) {
      return res.status(400).json({ error: 'Name, role, and organization are required.' });
    }

    const stmt = db.prepare(`
      UPDATE stakeholders
      SET name = ?, role = ?, organization = ?, key_responsibilities = ?, status = ?
      WHERE id = ?
    `);

    const result = stmt.run(name, role, organization, key_responsibilities || '', status || 'Active', id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Stakeholder not found.' });
    }

    const updated = db.prepare(`SELECT * FROM stakeholders WHERE id = ?`).get(id);
    res.json({ success: true, stakeholder: updated });
  } catch (error) {
    console.error('Error updating stakeholder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new stakeholder
app.post('/api/stakeholders', (req, res) => {
  try {
    const { name, role, organization, key_responsibilities, status } = req.body;

    if (!name || !role || !organization) {
      return res.status(400).json({ error: 'Name, role, and organization are required.' });
    }

    const stmt = db.prepare(`
      INSERT INTO stakeholders (name, role, organization, key_responsibilities, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(name, role, organization, key_responsibilities || '', status || 'Active');
    const created = db.prepare(`SELECT * FROM stakeholders WHERE id = ?`).get(result.lastInsertRowid);
    res.json({ success: true, stakeholder: created });
  } catch (error) {
    console.error('Error creating stakeholder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete stakeholder
app.delete('/api/stakeholders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare(`DELETE FROM stakeholders WHERE id = ?`);
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Stakeholder not found.' });
    }

    res.json({ success: true, message: 'Stakeholder deleted successfully.' });
  } catch (error) {
    console.error('Error deleting stakeholder:', error);
    res.status(500).json({ error: error.message });
  }
});



// Brief & Assumptions endpoint
app.get('/api/brief', (req, res) => {
  const brief = db.prepare(`SELECT * FROM brief WHERE id = 1`).get();
  const assumptions = db.prepare(`
    SELECT a.*, m.date as meeting_date
    FROM assumptions a
    JOIN meeting_metadata m ON a.updated_meeting_id = m.id
    ORDER BY a.id ASC
  `).all();

  res.json({ brief, assumptions });
});

// RAG AI Query endpoint
app.post('/api/rag/query', (req, res) => {
  const { query, filters } = req.body;
  if (!query) return res.status(400).json({ error: 'Query parameter required' });

  const result = answerRAGQuery(query, filters || {});
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Express REST API running on http://localhost:${PORT}`);
});
