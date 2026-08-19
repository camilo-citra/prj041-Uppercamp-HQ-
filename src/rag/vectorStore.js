import db from '../db/index.js';

export function indexMeetingChunks(meeting) {
  const insertChunkStmt = db.prepare(`
    INSERT INTO vector_chunks (meeting_id, date, subject, section_type, content)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Index Executive Summary
  if (meeting.executive_summary) {
    insertChunkStmt.run(
      meeting.id,
      meeting.date,
      meeting.title,
      'Executive Summary',
      meeting.executive_summary
    );
  }

  // Index Agenda Items & Discussion Notes
  for (const item of meeting.agenda_items) {
    insertChunkStmt.run(
      meeting.id,
      meeting.date,
      item.title,
      'Agenda Discussion',
      item.notes
    );
  }

  // Index Decisions
  for (const dec of meeting.decisions) {
    insertChunkStmt.run(
      meeting.id,
      meeting.date,
      dec.impact_area,
      'Decision Taken',
      `Decision ${dec.num} (${dec.impact_area}): ${dec.summary}`
    );
  }

  // Index Risks
  for (const rsk of meeting.risks) {
    insertChunkStmt.run(
      meeting.id,
      meeting.date,
      'Risk & Issue',
      'Risk/Roadblock',
      `Risk: ${rsk.description} | Contingency: ${rsk.contingency_measure}`
    );
  }
}

export function updateDecisionVectorChunk(meetingId, decisionNum, impactArea, summary, theme) {
  const contentStr = `Decision ${decisionNum || ''} (${impactArea}) [Theme: ${theme || 'General'}]: ${summary}`;
  
  // Find existing chunk or insert new
  const existing = db.prepare(`
    SELECT id FROM vector_chunks 
    WHERE meeting_id = ? AND section_type = 'Decision Taken' AND (content LIKE ? OR subject = ?)
  `).get(meetingId, `%Decision ${decisionNum}%`, impactArea);

  if (existing) {
    db.prepare(`
      UPDATE vector_chunks
      SET subject = ?, content = ?
      WHERE id = ?
    `).run(impactArea, contentStr, existing.id);
  } else {
    const meetingMeta = db.prepare('SELECT date FROM meeting_metadata WHERE id = ?').get(meetingId);
    const dateStr = meetingMeta ? meetingMeta.date : '2026-06-01';
    db.prepare(`
      INSERT INTO vector_chunks (meeting_id, date, subject, section_type, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(meetingId, dateStr, impactArea, 'Decision Taken', contentStr);
  }
}

export function searchVectorChunks(query, filters = {}, limit = 5) {
  const chunks = db.prepare(`SELECT * FROM vector_chunks`).all();
  if (!chunks.length) return [];

  const terms = tokenize(query);
  if (!terms.length) return chunks.slice(0, limit);

  const scored = chunks.map(chunk => {
    let score = 0;
    const contentLower = chunk.content.toLowerCase();
    const subjectLower = chunk.subject.toLowerCase();
    const sectionLower = chunk.section_type.toLowerCase();

    for (const t of terms) {
      if (contentLower.includes(t)) score += 3;
      if (subjectLower.includes(t)) score += 5;
      if (sectionLower.includes(t)) score += 2;
    }

    // Apply metadata filters if provided
    if (filters.meeting_id && chunk.meeting_id !== filters.meeting_id) {
      score = score * 0.1;
    }

    return { ...chunk, score };
  });

  return scored
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'was', 'are', 'from', 'have',
  'what', 'were', 'which', 'will', 'been', 'has', 'more', 'about', 'can'
]);
