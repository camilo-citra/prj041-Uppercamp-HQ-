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

/**
 * Proactively queries Vector Database for cross-meeting metadata tags and semantic clusters.
 * Retrieves overlapping discussions from Agenda items, Executive Summaries, Decisions, and Risks.
 */
export function getThematicAnalysisClusters() {
  const chunks = db.prepare(`
    SELECT vc.*, m.title as meeting_title
    FROM vector_chunks vc
    JOIN meeting_metadata m ON vc.meeting_id = m.id
    ORDER BY vc.date ASC
  `).all();

  const meetings = db.prepare(`SELECT id, title, date, executive_summary FROM meeting_metadata ORDER BY date ASC`).all();
  const decisions = db.prepare(`
    SELECT d.*, m.date as meeting_date, m.title as meeting_title 
    FROM decisions_taken d
    JOIN meeting_metadata m ON d.meeting_id = m.id
    ORDER BY m.date ASC
  `).all();
  const risks = db.prepare(`
    SELECT r.*, m.date as meeting_date, m.title as meeting_title
    FROM risk_raised r
    JOIN meeting_metadata m ON r.meeting_id = m.id
    ORDER BY m.date ASC
  `).all();

  // Define comprehensive semantic cluster templates with keyword signatures
  const clusterDefinitions = [
    {
      id: 'compliance_fire_egress',
      title: 'Fire Safety, Egress & Council BDM Approvals',
      category: 'Regulatory & Compliance',
      keywords: ['fire', 'egress', 'staircase', 'passage', '1200mm', '1500mm', 'bdm', 'council', 'departure', 'capacity', '90 people', 'safety', 'fire chief', 'disabled access'],
      icon: 'ShieldAlert',
      accentColor: '#ef4444'
    },
    {
      id: 'budget_seloxis_governance',
      title: 'Budget Caps, Financial Modeling & Stage 3 Freeze',
      category: 'Cost & Commercial Governance',
      keywords: ['budget', 'cost', 'seloxis', 'cash flow', 'stage 3', 'freeze', 'r8m', 'r12m', 'sign-off', 'financial', 'variance', 'fee', 'commercial'],
      icon: 'CircleDollarSign',
      accentColor: '#8b5cf6'
    },
    {
      id: 'interior_neighborhood_framework',
      title: 'Architectural Neighborhood Framework & EPOD Specs',
      category: 'Spatial & Interior Architecture',
      keywords: ['neighborhood', 'connect', 'build', 'inspire', 'community', 'boardroom', 'epod', 'acoustic', 'terrace', 'mezzanine', 'layout', 'pod', 'fit-out', 'revit'],
      icon: 'LayoutGrid',
      accentColor: '#38bdf8'
    },
    {
      id: 'structural_demolition_prep',
      title: 'Structural Integrity, Demolition & Site Readiness',
      category: 'Civil & Engineering',
      keywords: ['demolition', 'september 28', 'structural', 'trial pit', 'column', 'lift shaft', 'facade', 'loading', 'slab', 'roof garden', 'excavation', 'foundation'],
      icon: 'Hammer',
      accentColor: '#f59e0b'
    },
    {
      id: 'mep_hvac_infrastructure',
      title: 'MEP, HVAC & Wet Services Coordination',
      category: 'Building Systems',
      keywords: ['mep', 'hvac', 'condenser', 'wet services', 'electrical', 'ventilation', 'plumbing', 'duct', 'air conditioning', 'power', 'load'],
      icon: 'Cpu',
      accentColor: '#10b981'
    },
    {
      id: 'procurement_contractor_alignment',
      title: 'Contractor Procurement & Operational Delivery',
      category: 'Execution & Operations',
      keywords: ['contractor', 'procurement', 'tender', 'acc', 'milestone', 'schedule', 'relocation', 'coordination', 'deliverables', 'site'],
      icon: 'Users',
      accentColor: '#06b6d4'
    }
  ];

  const analyzedClusters = clusterDefinitions.map(def => {
    const matchedChunks = [];
    const citedMeetingsMap = new Map();
    const relatedDecisions = [];
    const relatedRisks = [];

    // 1. Scan vector chunks
    for (const chunk of chunks) {
      const textToScan = `${chunk.subject} ${chunk.content}`.toLowerCase();
      let matchCount = 0;
      for (const kw of def.keywords) {
        if (textToScan.includes(kw)) matchCount++;
      }

      if (matchCount > 0) {
        matchedChunks.push({
          id: chunk.id,
          meeting_id: chunk.meeting_id,
          date: chunk.date,
          subject: chunk.subject,
          section_type: chunk.section_type,
          excerpt: chunk.content.length > 200 ? chunk.content.slice(0, 197) + '...' : chunk.content,
          score: matchCount
        });

        if (!citedMeetingsMap.has(chunk.meeting_id)) {
          citedMeetingsMap.set(chunk.meeting_id, {
            meeting_id: chunk.meeting_id,
            date: chunk.date,
            count: 1
          });
        } else {
          citedMeetingsMap.get(chunk.meeting_id).count++;
        }
      }
    }

    // 2. Scan decisions
    for (const d of decisions) {
      const dText = `${d.impact_area} ${d.summary} ${d.theme || ''} ${d.rationale || ''}`.toLowerCase();
      if (def.keywords.some(kw => dText.includes(kw))) {
        relatedDecisions.push({
          id: d.id,
          decision_num: d.decision_num,
          impact_area: d.impact_area,
          summary: d.summary,
          meeting_id: d.meeting_id,
          date: d.meeting_date
        });
        if (!citedMeetingsMap.has(d.meeting_id)) {
          citedMeetingsMap.set(d.meeting_id, {
            meeting_id: d.meeting_id,
            date: d.meeting_date,
            count: 1
          });
        }
      }
    }

    // 3. Scan risks
    for (const r of risks) {
      const rText = `${r.description} ${r.contingency_measure || ''}`.toLowerCase();
      if (def.keywords.some(kw => rText.includes(kw))) {
        relatedRisks.push({
          id: r.id,
          risk_code: r.risk_code,
          description: r.description,
          impact_level: r.impact_level,
          likelihood: r.likelihood,
          meeting_id: r.meeting_id,
          date: r.meeting_date
        });
        if (!citedMeetingsMap.has(r.meeting_id)) {
          citedMeetingsMap.set(r.meeting_id, {
            meeting_id: r.meeting_id,
            date: r.meeting_date,
            count: 1
          });
        }
      }
    }

    const citedMeetings = Array.from(citedMeetingsMap.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate theme recurrence velocity & intensity
    const totalEvidenceCount = matchedChunks.length + relatedDecisions.length + relatedRisks.length;
    const meetingSpanCount = citedMeetings.length;
    const recurrencePercentage = meetings.length > 0 ? Math.round((meetingSpanCount / meetings.length) * 100) : 0;

    return {
      id: def.id,
      title: def.title,
      category: def.category,
      accentColor: def.accentColor,
      icon: def.icon,
      meetingSpanCount,
      recurrencePercentage,
      totalEvidenceCount,
      citedMeetings,
      topExcerpts: matchedChunks.sort((a, b) => b.score - a.score).slice(0, 4),
      relatedDecisions: relatedDecisions.slice(0, 4),
      relatedRisks: relatedRisks.slice(0, 3)
    };
  });

  // Sort clusters by highest cross-meeting persistence and evidence volume
  analyzedClusters.sort((a, b) => {
    if (b.meetingSpanCount !== a.meetingSpanCount) {
      return b.meetingSpanCount - a.meetingSpanCount;
    }
    return b.totalEvidenceCount - a.totalEvidenceCount;
  });

  return analyzedClusters;
}

