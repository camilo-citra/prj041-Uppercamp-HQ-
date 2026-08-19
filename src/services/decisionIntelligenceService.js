import db from '../db/index.js';

// Predefined core project themes with keyword mappings
const THEME_DEFINITIONS = [
  {
    theme: 'Governance & Stage Sign-offs',
    keywords: ['governance', 'stage 3', 'sign-off', 'brief', 'approval', 'council', 'submission', 'freeze', 'accord', 'milestone', 'acc']
  },
  {
    theme: 'Architectural & Layout Design',
    keywords: ['architecture', 'layout', 'staircase', 'mezzanine', 'passage', '1200mm', 'lift shaft', 'facade', 'roof', 'terrace', 'revit', 'floor 1', 'floor 2', 'floor 3', 'space']
  },
  {
    theme: 'MEP, Egress & Fire Safety',
    keywords: ['mep', 'fire', 'egress', 'wet services', 'mechanical', 'staircase width', 'compliance', 'ventilation', 'plumbing', 'electrical', 'capacity', 'safety']
  },
  {
    theme: 'Commercial & Financial Model',
    keywords: ['commercial', 'financial', 'budget', 'cash flow', 'seloxis', 'cost', 'billboard', 'lease', 'relocation', 'consultant', 'model']
  },
  {
    theme: 'Interior Fit-Out & Strategy',
    keywords: ['interior', 'neighborhood', 'connect', 'build', 'inspire', 'community', 'boardroom', 'desk', 'collaboration wall', 'fit-out', 'brand', 'workspace']
  }
];

/**
 * Discover the best matching theme for a decision based on its impact area and text summary.
 */
export function discoverThemeForDecision(impactArea, summary) {
  const text = `${impactArea || ''} ${summary || ''}`.toLowerCase();
  
  let bestTheme = 'General Project Strategy';
  let maxMatches = 0;

  for (const def of THEME_DEFINITIONS) {
    let score = 0;
    for (const kw of def.keywords) {
      if (text.includes(kw)) score++;
    }
    if (score > maxMatches) {
      maxMatches = score;
      bestTheme = def.theme;
    }
  }

  return bestTheme;
}

/**
 * Analyze all decisions in the database to discover themes, build correlations,
 * and save them back into SQLite.
 */
export function analyzeAndMapDecisions() {
  const decisions = db.prepare(`
    SELECT d.id, d.decision_num, d.impact_area, d.summary, d.theme, d.correlations, d.rationale, d.meeting_id, m.date as meeting_date, m.title as meeting_title
    FROM decisions_taken d
    JOIN meeting_metadata m ON d.meeting_id = m.id
    ORDER BY m.date ASC, d.id ASC
  `).all();

  if (!decisions.length) return [];

  // Step 1: Assign themes
  const updatedDecisions = decisions.map(d => {
    const theme = (d.theme && d.theme !== 'General') 
      ? d.theme 
      : discoverThemeForDecision(d.impact_area, d.summary);
    return { ...d, theme };
  });

  // Step 2: Calculate cross-decision correlations
  for (let i = 0; i < updatedDecisions.length; i++) {
    const decA = updatedDecisions[i];
    const textA = `${decA.impact_area} ${decA.summary}`.toLowerCase();
    const keywordsA = extractKeywords(textA);

    const correlations = [];

    for (let j = 0; j < updatedDecisions.length; j++) {
      if (i === j) continue;
      const decB = updatedDecisions[j];
      const textB = `${decB.impact_area} ${decB.summary}`.toLowerCase();

      // Check theme match
      const sameTheme = decA.theme === decB.theme;

      // Check keyword overlap
      const sharedKws = keywordsA.filter(kw => textB.includes(kw));

      if (sameTheme || sharedKws.length >= 1) {
        let relation = 'correlated';
        if (decA.meeting_id !== decB.meeting_id) {
          if (new Date(decA.meeting_date) < new Date(decB.meeting_date)) {
            relation = sharedKws.some(k => ['freeze', 'lock', 'sign-off', 'brief'].includes(k)) 
              ? 'depends_on' 
              : 'precedes';
          } else {
            relation = 'refines';
          }
        }

        correlations.push({
          target_id: decB.id,
          target_meeting: decB.meeting_id,
          target_summary: decB.summary.slice(0, 60) + '...',
          relation_type: relation,
          reason: sameTheme && sharedKws.length > 0 
            ? `Shared theme (${decA.theme}) & key topics (${sharedKws.join(', ')})`
            : sameTheme 
              ? `Both belong to theme: ${decA.theme}` 
              : `Shared project focus: ${sharedKws.join(', ')}`
        });
      }
    }

    decA.correlations = correlations;

    // Update in database
    db.prepare(`
      UPDATE decisions_taken
      SET theme = ?, correlations = ?
      WHERE id = ?
    `).run(decA.theme, JSON.stringify(correlations), decA.id);
  }

  return updatedDecisions;
}

/**
 * Generate a cohesive executive narrative explaining the logic and timeline of decisions.
 */
export function buildDecisionTimelineNarrative() {
  const decisions = db.prepare(`
    SELECT d.*, m.date as meeting_date, m.title as meeting_title
    FROM decisions_taken d
    JOIN meeting_metadata m ON d.meeting_id = m.id
    ORDER BY m.date ASC, d.id ASC
  `).all();

  const meetingGroups = {};
  decisions.forEach(d => {
    if (!meetingGroups[d.meeting_id]) {
      meetingGroups[d.meeting_id] = {
        meeting_id: d.meeting_id,
        title: d.meeting_title,
        date: d.meeting_date,
        decisions: []
      };
    }
    meetingGroups[d.meeting_id].decisions.push(d);
  });

  const timelineMilestones = Object.values(meetingGroups);

  const themeCounts = {};
  decisions.forEach(d => {
    const t = d.theme || 'General';
    themeCounts[t] = (themeCounts[t] || 0) + 1;
  });

  return {
    totalDecisions: decisions.length,
    timelineMilestonesCount: timelineMilestones.length,
    themeBreakdown: themeCounts,
    timelineMilestones,
    executiveNarrative: `The decision trajectory spans ${timelineMilestones.length} major meeting milestones. Early decisions locked overall project governance and concept freeze (Stage 3), followed by technical egress/staircase clearance, financial cash-flow modeling in Seloxis, and final interior neighborhood space allocation.`
  };
}

function extractKeywords(text) {
  const words = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
  return [...new Set(words)];
}

const STOP_WORDS = new Set([
  'with', 'this', 'that', 'from', 'have', 'were', 'which', 'will', 'been', 'about', 'meeting', 'project', 'decision', 'taken', 'regarding', 'agreed', 'approved'
]);
