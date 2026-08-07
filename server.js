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

// Project Dynamics Map Endpoint
app.get('/api/dynamics-map', (req, res) => {
  try {
    const decisions = db.prepare(`SELECT * FROM decisions_taken ORDER BY id ASC`).all();
    const risks = db.prepare(`SELECT * FROM risk_raised ORDER BY id ASC`).all();
    const brief = db.prepare(`SELECT * FROM brief WHERE id = 1`).get();
    const assumptions = db.prepare(`SELECT * FROM assumptions ORDER BY id ASC`).all();

    // Helper function to derive risk impact area
    const getRiskImpactArea = (r) => {
      const text = `${r.risk_code || ''} ${r.description || ''} ${r.contingency_measure || ''}`.toLowerCase();
      if (text.includes('budget') || text.includes('cost') || text.includes('financial') || text.includes('expense') || text.includes('creep')) {
        return 'Budget';
      }
      if (text.includes('fire') || text.includes('escape') || text.includes('sprinkler') || text.includes('egress')) {
        return 'Fire Strategy';
      }
      if (text.includes('delay') || text.includes('alignment') || text.includes('hods') || text.includes('schedule')) {
        return 'Process';
      }
      if (text.includes('lift') || text.includes('stair') || text.includes('structural') || text.includes('corrosion') || text.includes('hvac') || text.includes('load') || text.includes('pillar')) {
        return 'Specs';
      }
      return 'General';
    };

    // Level 0: Risk Nodes (Left Column)
    const riskNodes = risks.map(r => ({
      id: `risk_${r.id}`,
      db_id: r.id,
      type: 'risk_factor',
      label: r.risk_code ? `${r.risk_code}: ${r.description.slice(0, 45)}...` : r.description.slice(0, 50),
      description: r.description,
      contingency: r.contingency_measure,
      impact_area: getRiskImpactArea(r),
      impact_level: r.impact_level || 'Medium',
      status: r.status || 'Open',
      meeting_id: r.meeting_id,
      column: 0
    }));

    // Level 1: Decision Nodes (Center Column - grouped by impact_area)
    const decisionNodes = decisions.map(d => ({
      id: `decision_${d.id}`,
      db_id: d.id,
      type: 'decision',
      label: `DEC-${String(d.decision_num || d.id).padStart(3, '0')}: ${d.summary.slice(0, 45)}...`,
      summary: d.summary,
      impact_area: d.impact_area || 'General',
      meeting_id: d.meeting_id,
      column: 1
    }));

    // Level 2: Brief & Scope Impact Nodes (Right Column)
    const briefNodes = [
      {
        id: 'brief_core',
        db_id: brief ? brief.id : 1,
        type: 'brief_impact',
        label: brief ? `Brief: ${brief.title}` : 'Core Project Brief',
        description: brief ? brief.objective : 'Project Objective',
        impact_area: 'Brief',
        column: 2
      },
      ...assumptions.map(a => ({
        id: `brief_asm_${a.id}`,
        db_id: a.id,
        type: 'brief_impact',
        label: a.asm_code ? `${a.asm_code}: ${a.description.slice(0, 40)}...` : a.description.slice(0, 45),
        description: a.description,
        impact_area: a.category || 'Specs',
        status: a.status || 'Active',
        meeting_id: a.updated_meeting_id,
        column: 2
      }))
    ];

    const nodes = [...riskNodes, ...decisionNodes, ...briefNodes];

    // 2. Build Edges
    const edges = [];
    const edgeSet = new Set();

    decisionNodes.forEach(d => {
      risks.forEach(r => {
        const dText = d.summary.toLowerCase();
        const rText = r.description.toLowerCase();
        const sameMeeting = d.meeting_id === r.meeting_id;
        
        let linkType = null;
        if (r.status === 'Closed' && (sameMeeting || dText.includes('perimeter') || dText.includes('fire') || dText.includes('1200mm'))) {
          linkType = 'closes_risk';
        } else if (sameMeeting || (r.risk_code && dText.includes(r.risk_code.toLowerCase()))) {
          linkType = 'creates_risk';
        }

        if (linkType) {
          const edgeId = `edge_risk_${r.id}_dec_${d.id}`;
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            edges.push({
              id: edgeId,
              source: `risk_${r.id}`,
              target: `decision_${d.id}`,
              type: linkType
            });
          }
        }
      });

      briefNodes.forEach(b => {
        if (d.impact_area === 'Brief' || d.impact_area === 'Specs' || d.impact_area === 'General' || d.summary.toLowerCase().includes('structure') || d.summary.toLowerCase().includes('design')) {
          if (b.id === 'brief_core' || b.impact_area === d.impact_area) {
            const edgeId = `edge_dec_${d.id}_brief_${b.id}`;
            if (!edgeSet.has(edgeId)) {
              edgeSet.add(edgeId);
              edges.push({
                id: edgeId,
                source: `decision_${d.id}`,
                target: b.id,
                type: 'affects_brief'
              });
            }
          }
        }
      });
    });

    // 3. Build Inter-Decision Evolution Edges (evolves_to)
    const decisionsByArea = {};
    decisionNodes.forEach(d => {
      if (!decisionsByArea[d.impact_area]) decisionsByArea[d.impact_area] = [];
      decisionsByArea[d.impact_area].push(d);
    });

    Object.values(decisionsByArea).forEach(group => {
      for (let i = 0; i < group.length - 1; i++) {
        const src = group[i];
        const tgt = group[i + 1];
        const edgeId = `edge_dec_${src.db_id}_evolves_${tgt.db_id}`;
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({
            id: edgeId,
            source: src.id,
            target: tgt.id,
            type: 'evolves_to'
          });
        }
      }
    });

    const clusterCounts = {};

    decisionNodes.forEach(d => {
      clusterCounts[d.impact_area] = (clusterCounts[d.impact_area] || 0) + 1;
    });

    res.json({
      nodes,
      edges,
      clusterCounts,
      totalDecisions: decisionNodes.length,
      totalRisks: riskNodes.length,
      totalBriefEntities: briefNodes.length
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
