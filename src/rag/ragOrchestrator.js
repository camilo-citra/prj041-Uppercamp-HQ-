import db from '../db/index.js';
import { searchVectorChunks } from './vectorStore.js';

export function answerRAGQuery(query, filters = {}) {
  // Perform vector/similarity search over discussions and summaries
  const matchedChunks = searchVectorChunks(query, filters, 6);

  // Search relational database records (decisions, actions, risks)
  const queryLower = `%${query}%`;

  const decisions = db.prepare(`
    SELECT d.*, m.date, m.title as meeting_title
    FROM decisions_taken d
    JOIN meeting_metadata m ON d.meeting_id = m.id
    WHERE d.summary LIKE ? OR d.impact_area LIKE ? OR ? LIKE '%decision%'
  `).all(queryLower, queryLower, queryLower).slice(0, 8);

  const actions = db.prepare(`
    SELECT a.*, m.date
    FROM action_items a
    JOIN meeting_metadata m ON a.meeting_id = m.id
    WHERE a.description LIKE ? OR a.assignee LIKE ? OR ? LIKE '%action%'
  `).all(queryLower, queryLower, queryLower).slice(0, 8);

  const risks = db.prepare(`
    SELECT r.*, m.date
    FROM risk_raised r
    JOIN meeting_metadata m ON r.meeting_id = m.id
    WHERE r.description LIKE ? OR r.contingency_measure LIKE ? OR ? LIKE '%risk%'
  `).all(queryLower, queryLower, queryLower).slice(0, 8);

  const totalSources = matchedChunks.length + decisions.length + actions.length + risks.length;

  if (!totalSources) {
    return {
      consolidatedSummary: `No specific meeting decisions or notes found matching query: "${query}".`,
      keyTakeaways: ['No direct keyword or vector match located in ingested minutes.'],
      actionSummary: [],
      riskSummary: [],
      citations: [],
      sourcesCount: 0
    };
  }

  // Synthesize Key Takeaways
  const keyTakeaways = [];
  if (decisions.length) {
    keyTakeaways.push(`${decisions.length} core decision(s) established across project meetings.`);
  }
  if (actions.length) {
    keyTakeaways.push(`${actions.length} action item(s) logged for follow-up and execution.`);
  }
  if (risks.length) {
    keyTakeaways.push(`${risks.length} associated risk(s) identified with mitigation strategies.`);
  }
  if (matchedChunks.length) {
    keyTakeaways.push(`Discussion notes extracted from ${new Set(matchedChunks.map(c => c.meeting_id)).size} meeting session(s).`);
  }

  // Synthesize Executive Consolidated Narrative
  const overviewParts = [];
  overviewParts.push(`### Executive Summary Synthesis`);
  overviewParts.push(`Based on project meeting records for **prj041 - Uppercamp HQ**, the query **"${query}"** yields the following consolidated intelligence:\n`);

  if (decisions.length) {
    overviewParts.push(`#### 📌 Key Decisions Taken`);
    decisions.forEach(d => {
      overviewParts.push(`- **Decision ${d.decision_num} (${d.impact_area} | ${d.meeting_id} - ${d.date}):** ${d.summary}`);
    });
    overviewParts.push(``);
  }

  if (actions.length) {
    overviewParts.push(`#### 📋 Immediate Action Items & Task Allocations`);
    actions.forEach(a => {
      overviewParts.push(`- **[${a.meeting_id}]** ${a.description} *(Assigned: ${a.assignee} | Due: ${a.due_date} | Status: ${a.status})*`);
    });
    overviewParts.push(``);
  }

  if (risks.length) {
    overviewParts.push(`#### ⚠️ Risk Factors & Contingency Measures`);
    risks.forEach(r => {
      overviewParts.push(`- **[${r.meeting_id}] Risk:** ${r.description}\n  *Mitigation:* ${r.contingency_measure} (Impact: ${r.impact_level}, Likelihood: ${r.likelihood})`);
    });
    overviewParts.push(``);
  }

  if (matchedChunks.length) {
    overviewParts.push(`#### 💬 Contextual Discussion Excerpts`);
    matchedChunks.forEach(c => {
      overviewParts.push(`- **[${c.meeting_id} - ${c.subject} (${c.section_type})]:** "${c.content.slice(0, 240)}..."`);
    });
  }

  const consolidatedSummary = overviewParts.join('\n');

  // Build Citations List
  const citations = [];
  decisions.forEach(d => citations.push({ meeting_id: d.meeting_id, date: d.date, section: `Decision ${d.decision_num}`, text: d.summary }));
  actions.forEach(a => citations.push({ meeting_id: a.meeting_id, date: a.date, section: 'Action Item', text: a.description }));
  risks.forEach(r => citations.push({ meeting_id: r.meeting_id, date: r.date, section: 'Risk', text: r.description }));
  matchedChunks.forEach(c => citations.push({ meeting_id: c.meeting_id, date: c.date, section: c.section_type, text: c.content.slice(0, 150) }));

  // Deduplicate citations
  const uniqueCitations = [];
  const seenKeys = new Set();
  for (const c of citations) {
    const key = `${c.meeting_id}-${c.section}-${c.text.slice(0, 20)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueCitations.push(c);
    }
  }

  return {
    consolidatedSummary,
    keyTakeaways,
    actionSummary: actions,
    riskSummary: risks,
    decisionsSummary: decisions,
    citations: uniqueCitations,
    sourcesCount: totalSources
  };
}
