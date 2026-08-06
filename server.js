import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './src/db/index.js';
import { ingestAllMeetings } from './src/services/ingestionService.js';
import { answerRAGQuery } from './src/rag/ragOrchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
  const chunks = db.prepare(`SELECT subject, section_type, content FROM vector_chunks WHERE meeting_id = ?`).all(req.params.id);

  res.json({
    ...meeting,
    decisions,
    actions,
    risks,
    chunks
  });
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
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const result = db.prepare(`UPDATE action_items SET status = ? WHERE id = ?`).run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Action item not found' });

  res.json({ success: true, id: req.params.id, status });
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
