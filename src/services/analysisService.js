import db from '../db/index.js';
import { getThematicAnalysisClusters } from '../rag/ragOrchestrator.js';

/**
 * Qualitative Content Analysis Engine
 * Performs SQL queries to aggregate and quantify structured data from SQLite.
 */
export function getQualitativeContentMetrics() {
  // 1. Group and count records from decisions_taken by Impact Area
  const rawDecisionsByImpact = db.prepare(`
    SELECT impact_area, count(*) as count
    FROM decisions_taken
    GROUP BY impact_area
    ORDER BY count DESC
  `).all();

  const totalDecisions = db.prepare(`SELECT count(*) as count FROM decisions_taken`).get().count;

  // Standard impact areas normalization
  const standardAreas = ['Brief', 'Budget', 'Process', 'Specs', 'Task Allocation'];
  const decisionsByImpact = standardAreas.map(area => {
    const found = rawDecisionsByImpact.find(d => d.impact_area.toLowerCase() === area.toLowerCase());
    const count = found ? found.count : 0;
    const percentage = totalDecisions > 0 ? Math.round((count / totalDecisions) * 100) : 0;
    return {
      impact_area: area,
      count,
      percentage
    };
  });

  // Check for any other custom impact areas
  rawDecisionsByImpact.forEach(d => {
    if (!standardAreas.some(sa => sa.toLowerCase() === d.impact_area.toLowerCase())) {
      decisionsByImpact.push({
        impact_area: d.impact_area,
        count: d.count,
        percentage: totalDecisions > 0 ? Math.round((d.count / totalDecisions) * 100) : 0
      });
    }
  });

  // Calculate Budget vs. Process statistical breakdown
  const budgetCount = (decisionsByImpact.find(d => d.impact_area.toLowerCase() === 'budget') || { count: 0 }).count;
  const processCount = (decisionsByImpact.find(d => d.impact_area.toLowerCase() === 'process') || { count: 0 }).count;
  const specsCount = (decisionsByImpact.find(d => d.impact_area.toLowerCase() === 'specs') || { count: 0 }).count;
  const briefCount = (decisionsByImpact.find(d => d.impact_area.toLowerCase() === 'brief') || { count: 0 }).count;
  const taskCount = (decisionsByImpact.find(d => d.impact_area.toLowerCase() === 'task allocation') || { count: 0 }).count;

  const budgetVsProcess = {
    budget_count: budgetCount,
    budget_percentage: totalDecisions > 0 ? Math.round((budgetCount / totalDecisions) * 100) : 0,
    process_count: processCount,
    process_percentage: totalDecisions > 0 ? Math.round((processCount / totalDecisions) * 100) : 0,
    budget_to_process_ratio: processCount > 0 ? (budgetCount / processCount).toFixed(2) : budgetCount.toString(),
    comparative_summary: budgetCount >= processCount
      ? `Budget-governed decisions represent ${Math.round((budgetCount / totalDecisions) * 100)}% of project choices, reflecting intense cost management and value engineering priorities.`
      : `Process and workflow decisions represent ${Math.round((processCount / totalDecisions) * 100)}% of total decisions, prioritizing operational alignment and statutory council submission sequences.`
  };

  // 2. Categorize risk_raised by Impact Level and Likelihood 3x3 grid
  const rawRisks = db.prepare(`
    SELECT r.*, m.date as meeting_date, m.title as meeting_title
    FROM risk_raised r
    JOIN meeting_metadata m ON r.meeting_id = m.id
  `).all();

  const totalRisks = rawRisks.length;
  const openRisks = rawRisks.filter(r => (r.status || '').toLowerCase() === 'open').length;
  const closedRisks = totalRisks - openRisks;

  const levels = ['High', 'Medium', 'Low'];
  const riskGrid = {
    High: { High: [], Medium: [], Low: [] },
    Medium: { High: [], Medium: [], Low: [] },
    Low: { High: [], Medium: [], Low: [] }
  };

  const riskGridCounts = {
    High: { High: 0, Medium: 0, Low: 0 },
    Medium: { High: 0, Medium: 0, Low: 0 },
    Low: { High: 0, Medium: 0, Low: 0 }
  };

  rawRisks.forEach(r => {
    let imp = (r.impact_level || 'Medium').trim();
    let lik = (r.likelihood || 'Medium').trim();

    if (!levels.includes(imp)) imp = 'Medium';
    if (!levels.includes(lik)) lik = 'Medium';

    riskGrid[imp][lik].push({
      id: r.id,
      risk_code: r.risk_code,
      description: r.description,
      contingency_measure: r.contingency_measure,
      status: r.status,
      meeting_id: r.meeting_id,
      date: r.meeting_date
    });
    riskGridCounts[imp][lik]++;
  });

  // High Impact risks for proactive alerting
  const highImpactRisks = rawRisks.filter(r => (r.impact_level || '').toLowerCase() === 'high');

  // 3. Quantify assumptions by their Active / Adjusted / Invalidated status & category
  const rawAssumptions = db.prepare(`
    SELECT a.*, m.date as meeting_date, m.title as meeting_title
    FROM assumptions a
    JOIN meeting_metadata m ON a.updated_meeting_id = m.id
  `).all();

  const totalAssumptions = rawAssumptions.length;
  const assumptionsByStatus = db.prepare(`
    SELECT status, count(*) as count
    FROM assumptions
    GROUP BY status
    ORDER BY count DESC
  `).all().map(a => ({
    status: a.status || 'Active',
    count: a.count,
    percentage: totalAssumptions > 0 ? Math.round((a.count / totalAssumptions) * 100) : 0
  }));

  const assumptionsByCategory = db.prepare(`
    SELECT category, count(*) as count
    FROM assumptions
    GROUP BY category
    ORDER BY count DESC
  `).all();

  // Active lingering assumptions (especially unverified architectural or regulatory assumptions)
  const lingeringAssumptions = rawAssumptions.filter(a => (a.status || '').toLowerCase() === 'active');

  return {
    summary: {
      totalDecisions,
      totalRisks,
      openRisks,
      closedRisks,
      totalAssumptions,
      activeAssumptions: lingeringAssumptions.length
    },
    decisionsByImpact,
    budgetVsProcess,
    riskMatrix: {
      grid: riskGrid,
      counts: riskGridCounts,
      highImpactRisks
    },
    assumptions: {
      byStatus: assumptionsByStatus,
      byCategory: assumptionsByCategory,
      lingeringAssumptions
    }
  };
}

/**
 * Execute Project Intelligence Analyst System Agent
 * Ingests SQLite content metrics and Vector DB thematic clusters, synthesizing structured JSON.
 */
export function generateProjectAnalysis() {
  const contentMetrics = getQualitativeContentMetrics();
  const thematicClusters = getThematicAnalysisClusters();
  const meetings = db.prepare(`SELECT id, title, date, executive_summary FROM meeting_metadata ORDER BY date ASC`).all();

  // Filter top 3 recurring project themes citing specific meeting dates
  const top3Clusters = thematicClusters.slice(0, 3);

  const top3RecurringThemes = top3Clusters.map((cluster, index) => {
    const citedMeetingDates = cluster.citedMeetings.map(m => `${m.meeting_id} (${m.date})`);
    
    let narrative = '';
    if (cluster.id === 'compliance_fire_egress') {
      narrative = `Persistent compliance alignment spanning ${citedMeetingDates.join(', ')}. Key focus on staircase widths, 1200mm egress corridors, and reducing capacity from 140 to 90 to meet fire safety and disabled access criteria before dual Land Use & BDM council submission.`;
    } else if (cluster.id === 'budget_seloxis_governance') {
      narrative = `Rigorous financial governance across ${citedMeetingDates.join(', ')}. Establishing Seloxis cash-flow tracking, controlling contractor tender packages against R8m-R12m project targets, and enforcing Stage 3 concept freeze protocols.`;
    } else if (cluster.id === 'interior_neighborhood_framework') {
      narrative = `Consistent space planning iterations across ${citedMeetingDates.join(', ')} structured around Kim Williams' 4-zone behavioral framework (Connect, Build, Inspire, Community) and acoustic EPOD pod specifications.`;
    } else {
      narrative = `Cross-meeting coordination documented across ${citedMeetingDates.join(', ')} addressing technical dependencies and delivery milestones.`;
    }

    return {
      rank: index + 1,
      theme_id: cluster.id,
      theme_title: cluster.title,
      category: cluster.category,
      accentColor: cluster.accentColor,
      icon: cluster.icon,
      recurrence_count: cluster.meetingSpanCount,
      recurrence_percentage: cluster.recurrencePercentage,
      cited_meeting_dates: citedMeetingDates,
      cited_meetings: cluster.citedMeetings,
      narrative,
      key_evidence: cluster.topExcerpts.map(e => ({
        meeting_id: e.meeting_id,
        date: e.date,
        subject: e.subject,
        excerpt: e.excerpt
      })),
      associated_decisions: cluster.relatedDecisions,
      associated_risks: cluster.relatedRisks
    };
  });

  // Generate Proactive Warnings
  const proactiveWarnings = [];

  // 1. High Impact / High Likelihood Risks Warning
  if (contentMetrics.riskMatrix.counts.High.High > 0 || contentMetrics.riskMatrix.counts.High.Medium > 0) {
    const criticalRisks = [
      ...contentMetrics.riskMatrix.grid.High.High,
      ...contentMetrics.riskMatrix.grid.High.Medium
    ];
    proactiveWarnings.push({
      type: 'RISK_ALERT',
      severity: 'CRITICAL',
      title: 'High-Impact Project Risks Requiring Mitigation',
      message: `${criticalRisks.length} critical risk(s) identified with High Impact severity across the project lifecycle.`,
      items: criticalRisks.map(r => ({
        code: r.risk_code,
        title: r.description,
        contingency: r.contingency_measure,
        meeting_ref: `${r.meeting_id} (${r.date})`
      }))
    });
  }

  // 2. Lingering Assumptions Warning
  if (contentMetrics.assumptions.lingeringAssumptions.length > 0) {
    const activeAssumptions = contentMetrics.assumptions.lingeringAssumptions;
    proactiveWarnings.push({
      type: 'ASSUMPTION_ALERT',
      severity: 'WARNING',
      title: 'Lingering Active Assumptions Requiring Validation',
      message: `${activeAssumptions.length} assumption(s) remain Active without formal validation or adjustments, posing scope and timeline variance risks.`,
      items: activeAssumptions.map(a => ({
        code: a.asm_code || 'ASM',
        category: a.category,
        description: a.description,
        meeting_ref: `${a.updated_meeting_id} (${a.meeting_date})`
      }))
    });
  }

  // 3. Strategic Balance Warning (Budget vs Process)
  const budgetRatio = contentMetrics.budgetVsProcess.budget_percentage;
  const processRatio = contentMetrics.budgetVsProcess.process_percentage;
  proactiveWarnings.push({
    type: 'GOVERNANCE_ADVISORY',
    severity: 'INFO',
    title: 'Decision Impact Governance Spectrum',
    message: `Decisions are balanced at ${budgetRatio}% Budget / Financial vs ${processRatio}% Process / Operational, with remainder in Specs & Task Allocations.`,
    metrics: {
      budget_percentage: budgetRatio,
      process_percentage: processRatio,
      specs_percentage: (contentMetrics.decisionsByImpact.find(d => d.impact_area.toLowerCase() === 'specs') || { percentage: 0 }).percentage
    }
  });

  // Construct final Agent Output conforming strictly to the LLM system prompt
  const agentIntelligence = {
    analyst_role: 'Project Intelligence Analyst',
    status: 'OPTIMAL',
    generated_at: new Date().toISOString(),
    top_3_recurring_themes: top3RecurringThemes,
    statistical_breakdown_budget_vs_process: {
      budget_decisions_count: contentMetrics.budgetVsProcess.budget_count,
      budget_decisions_percentage: contentMetrics.budgetVsProcess.budget_percentage,
      process_decisions_count: contentMetrics.budgetVsProcess.process_count,
      process_decisions_percentage: contentMetrics.budgetVsProcess.process_percentage,
      specs_decisions_count: (contentMetrics.decisionsByImpact.find(d => d.impact_area.toLowerCase() === 'specs') || { count: 0 }).count,
      brief_decisions_count: (contentMetrics.decisionsByImpact.find(d => d.impact_area.toLowerCase() === 'brief') || { count: 0 }).count,
      task_decisions_count: (contentMetrics.decisionsByImpact.find(d => d.impact_area.toLowerCase() === 'task allocation') || { count: 0 }).count,
      analysis_narrative: contentMetrics.budgetVsProcess.comparative_summary
    },
    proactive_warnings: proactiveWarnings
  };

  return {
    success: true,
    metadata: {
      total_meetings_analyzed: meetings.length,
      total_vector_chunks_scanned: db.prepare('SELECT count(*) as count FROM vector_chunks').get().count,
      total_decisions_analyzed: contentMetrics.summary.totalDecisions,
      total_risks_analyzed: contentMetrics.summary.totalRisks,
      total_assumptions_analyzed: contentMetrics.summary.totalAssumptions,
      generated_at: new Date().toISOString()
    },
    thematicAnalysis: {
      topThemes: top3RecurringThemes,
      allClusters: thematicClusters
    },
    contentMetrics,
    agentIntelligence
  };
}
