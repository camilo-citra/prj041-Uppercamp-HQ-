import db from '../db/index.js';
import { searchVectorChunks } from './vectorStore.js';

export function answerRAGQuery(query, filters = {}) {
  // Perform vector/similarity search over discussions and summaries
  const matchedChunks = searchVectorChunks(query, filters, 5);

  // Search relational database records (decisions, actions, risks)
  const queryLower = `%${query}%`;

  const decisions = db.prepare(`
    SELECT d.*, m.date, m.title as meeting_title
    FROM decisions_taken d
    JOIN meeting_metadata m ON d.meeting_id = m.id
    WHERE d.summary LIKE ? OR d.impact_area LIKE ?
  `).all(queryLower, queryLower);

  const actions = db.prepare(`
    SELECT a.*, m.date
    FROM action_items a
    JOIN meeting_metadata m ON a.meeting_id = m.id
    WHERE a.description LIKE ? OR a.assignee LIKE ?
  `).all(queryLower, queryLower);

  const risks = db.prepare(`
    SELECT r.*, m.date
    FROM risk_raised r
    JOIN meeting_metadata m ON r.meeting_id = m.id
    WHERE r.description LIKE ? OR r.contingency_measure LIKE ?
  `).all(queryLower, queryLower);

  // Build grounded response synthesis with explicit citations
  const citations = [];
  const synthesisParagraphs = [];

  if (decisions.length) {
    synthesisParagraphs.push(`**Relevant Decisions Identified:**`);
    decisions.forEach(d => {
      synthesisParagraphs.push(`- **[${d.meeting_id} | ${d.date}]** Decision ${d.decision_num} (${d.impact_area}): ${d.summary}`);
      citations.push({ meeting_id: d.meeting_id, section: `Decision ${d.decision_num}`, text: d.summary });
    });
  }

  if (actions.length) {
    synthesisParagraphs.push(`\n**Relevant Action Items:**`);
    actions.forEach(a => {
      synthesisParagraphs.push(`- **[${a.meeting_id}]** ${a.description} (Assigned to: ${a.assignee}, Status: ${a.status}, Due: ${a.due_date})`);
      citations.push({ meeting_id: a.meeting_id, section: 'Action Item', text: a.description });
    });
  }

  if (risks.length) {
    synthesisParagraphs.push(`\n**Associated Risks & Contingencies:**`);
    risks.forEach(r => {
      synthesisParagraphs.push(`- **[${r.meeting_id}]** Risk: ${r.description} (Impact: ${r.impact_level}, Likelihood: ${r.likelihood}). Contingency: ${r.contingency_measure}`);
      citations.push({ meeting_id: r.meeting_id, section: 'Risk', text: r.description });
    });
  }

  if (matchedChunks.length) {
    synthesisParagraphs.push(`\n**Contextual Discussion Excerpts:**`);
    matchedChunks.forEach(chunk => {
      synthesisParagraphs.push(`- **[${chunk.meeting_id} - ${chunk.subject} (${chunk.section_type})]:** "${chunk.content.slice(0, 280)}..."`);
      citations.push({ meeting_id: chunk.meeting_id, section: chunk.section_type, text: chunk.content });
    });
  }

  if (!synthesisParagraphs.length) {
    return {
      answer: `No specific meeting decisions or notes found matching query: "${query}". Try searching for terms like "fire", "hvac", "lift", "revit", "budget", "staircase", or "facade".`,
      citations: [],
      sourcesCount: 0
    };
  }

  const fullAnswer = synthesisParagraphs.join('\n');

  // Deduplicate citations by meeting_id and section
  const uniqueCitations = [];
  const seenKeys = new Set();
  for (const c of citations) {
    const key = `${c.meeting_id}-${c.section}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueCitations.push(c);
    }
  }

  return {
    answer: fullAnswer,
    citations: uniqueCitations,
    sourcesCount: matchedChunks.length + decisions.length + actions.length + risks.length
  };
}
