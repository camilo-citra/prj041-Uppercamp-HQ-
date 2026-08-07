import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './src/db/index.js';
import { ingestAllMeetings } from './src/services/ingestionService.js';
import { answerRAGQuery } from './src/rag/ragOrchestrator.js';

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

// Project Dynamics Map Endpoint (Chronological Meeting Matrix)
app.get('/api/dynamics-map', (req, res) => {
  try {
    const decisions = db.prepare(`SELECT * FROM decisions_taken ORDER BY id ASC`).all();
    const risks = db.prepare(`SELECT * FROM risk_raised ORDER BY id ASC`).all();
    const actions = db.prepare(`SELECT * FROM action_items ORDER BY id ASC`).all();
    const brief = db.prepare(`SELECT * FROM brief WHERE id = 1`).get();

    // Meeting Timeline Column Mapping (Meeting 1 -> Meeting 5)
    const meetingMap = {
      'Minutes00': { col: 0, label: 'MEETING 1', date: 'Stage 1 Init' },
      'Minutes01': { col: 1, label: 'MEETING 2', date: 'Stage 1 Signoff' },
      'Minutes02': { col: 2, label: 'MEETING 3', date: 'Stage 2 Design' },
      'Minutes03': { col: 2, label: 'MEETING 3', date: 'Stage 2 Alignment' },
      'Minutes04': { col: 3, label: 'MEETING 4', date: 'Stage 3 Freeze' },
      'Minutes05': { col: 4, label: 'MEETING 5', date: 'Stage 3 Site Work' }
    };

    // Helper to map any item strictly into 3 Y-Categories: 'Budget', 'Specs', 'Process'
    const normalizeCategory = (text, origCategory) => {
      const catStr = (origCategory || '').toLowerCase();
      const s = `${text || ''} ${catStr}`.toLowerCase();

      // 1. Explicit Category Checks
      if (catStr.includes('budget') || catStr.includes('cost') || catStr.includes('fee') || catStr.includes('financial') || catStr.includes('exclusion')) {
        return 'Budget';
      }
      if (catStr.includes('task') || catStr.includes('process') || catStr.includes('protocol') || catStr.includes('software') || catStr.includes('aligned') || catStr.includes('sign-off')) {
        return 'Process';
      }

      // 2. Keyword Checks
      if (s.includes('budget') || s.includes('cost') || s.includes('fee') || s.includes('financial') || s.includes('expense') || s.includes('cash flow') || s.includes('r8m') || s.includes('r12m') || s.includes('revenue')) {
        return 'Budget';
      }
      if (s.includes('workflow') || s.includes('protocol') || s.includes('email') || s.includes('meeting') || s.includes('sign-off') || s.includes('approval') || s.includes('decoupled') || s.includes('seloxis') || s.includes('policy') || s.includes('coordination') || s.includes('feedback') || s.includes('assign') || s.includes('review') || s.includes('schedule')) {
        return 'Process';
      }

      return 'Specs';
    };

    // 1. Build Nodes
    // Risks
    const riskNodes = risks.map(r => {
      const mtg = meetingMap[r.meeting_id] || { col: 0, label: 'MEETING 1' };
      return {
        id: `risk_${r.id}`,
        db_id: r.id,
        type: 'risk_factor',
        label: r.risk_code ? `${r.risk_code}: ${r.description.slice(0, 42)}...` : r.description.slice(0, 45),
        description: r.description,
        contingency: r.contingency_measure,
        category: normalizeCategory(r.description + ' ' + (r.contingency_measure || ''), r.impact_level),
        status: r.status || 'Open',
        meeting_id: r.meeting_id,
        meeting_label: mtg.label,
        column: mtg.col
      };
    });

    // Decisions
    const decisionNodes = decisions.map(d => {
      const mtg = meetingMap[d.meeting_id] || { col: 1, label: 'MEETING 2' };
      return {
        id: `decision_${d.id}`,
        db_id: d.id,
        type: 'decision',
        label: `DEC-${String(d.decision_num || d.id).padStart(3, '0')}: ${d.summary.slice(0, 42)}...`,
        summary: d.summary,
        category: normalizeCategory(d.summary, d.impact_area),
        meeting_id: d.meeting_id,
        meeting_label: mtg.label,
        column: mtg.col
      };
    });

    // Action Items
    const actionNodes = actions.map(a => {
      const mtg = meetingMap[a.meeting_id] || { col: 2, label: 'MEETING 3' };
      return {
        id: `action_${a.id}`,
        db_id: a.id,
        type: 'action_item',
        label: a.action_code ? `${a.action_code}: ${a.description.slice(0, 40)}...` : a.description.slice(0, 42),
        description: a.description,
        assignee: a.assignee,
        due_date: a.due_date,
        status: a.status,
        category: normalizeCategory(a.description + ' ' + a.assignee, 'Process'),
        meeting_id: a.meeting_id,
        meeting_label: mtg.label,
        column: mtg.col
      };
    });

    // Brief Baseline Node
    const briefNode = {
      id: 'brief_core',
      db_id: 1,
      type: 'brief_impact',
      label: brief ? `Brief: ${brief.title}` : 'Core Project Brief',
      description: brief ? brief.objective : 'Project Objective',
      category: 'Specs',
      meeting_id: 'Minutes00',
      meeting_label: 'MEETING 1',
      column: 0
    };

    const nodes = [...riskNodes, ...decisionNodes, ...actionNodes, briefNode];

    // 2. Build Dependency Edges
    const edges = [];
    const edgeSet = new Set();

    // Link risks to decisions that address them in same or later meetings
    decisionNodes.forEach(d => {
      risks.forEach(r => {
        const dText = d.summary.toLowerCase();
        const rCol = meetingMap[r.meeting_id]?.col || 0;

        if (d.column >= rCol && (d.category === r.category || dText.includes('fire') || dText.includes('lift') || dText.includes('budget') || dText.includes('1200mm') || dText.includes('stair'))) {
          const edgeId = `edge_risk_${r.id}_dec_${d.id}`;
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            edges.push({
              id: edgeId,
              source: `risk_${r.id}`,
              target: `decision_${d.id}`,
              type: r.status === 'Closed' ? 'closes_risk' : 'creates_risk'
            });
          }
        }
      });
    });

    // Link sequential decisions in same category across meetings
    const decisionsByCategory = {};
    decisionNodes.forEach(d => {
      if (!decisionsByCategory[d.category]) decisionsByCategory[d.category] = [];
      decisionsByCategory[d.category].push(d);
    });

    Object.values(decisionsByCategory).forEach(group => {
      group.sort((a, b) => a.column - b.column);
      for (let i = 0; i < group.length - 1; i++) {
        const src = group[i];
        const tgt = group[i + 1];
        if (src.column < tgt.column) {
          const edgeId = `edge_dec_${src.db_id}_evolves_${tgt.db_id}`;
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            edges.push({
              id: edgeId,
              source: src.id,
              target: tgt.id,
              type: 'dependency'
            });
          }
        }
      }
    });

    // Link actions to decisions
    actionNodes.forEach(a => {
      const matchDec = decisionNodes.find(d => d.meeting_id === a.meeting_id && d.category === a.category);
      if (matchDec) {
        const edgeId = `edge_dec_${matchDec.id}_act_${a.id}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({
            id: edgeId,
            source: matchDec.id,
            target: a.id,
            type: 'dependency'
          });
        }
      }
    });

    const clusterCounts = {};
    decisionNodes.forEach(d => {
      clusterCounts[d.category] = (clusterCounts[d.category] || 0) + 1;
    });

    res.json({
      nodes,
      edges,
      clusterCounts,
      meetings: [
        { col: 0, key: 'Minutes00', label: 'MEETING 1', date: 'Stage 1 Init' },
        { col: 1, key: 'Minutes01', label: 'MEETING 2', date: 'Stage 1 Signoff' },
        { col: 2, key: 'Minutes02', label: 'MEETING 3', date: 'Stage 2 Design' },
        { col: 3, key: 'Minutes04', label: 'MEETING 4', date: 'Stage 3 Freeze' },
        { col: 4, key: 'Minutes05', label: 'MEETING 5', date: 'Stage 3 Site Work' }
      ],
      categories: ['Budget', 'Specs', 'Process']
    });
  } catch (error) {
    console.error('Error fetching dynamics map:', error);
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
