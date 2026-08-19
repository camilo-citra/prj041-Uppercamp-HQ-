import db from '../db/index.js';

// Domain definitions with keyword rules
const DOMAIN_DEFINITIONS = [
  {
    id: 'fire_safety',
    label: 'Fire & Egress Safety',
    color: '#ef4444', // Red
    keywords: ['fire', 'egress', 'exit', 'sprinkler', 'escape', 'fire chief', 'staircase width', '1200mm', '1500mm', 'safety', 'stair']
  },
  {
    id: 'arch_design',
    label: 'Architectural & Layout',
    color: '#3b82f6', // Blue
    keywords: ['revit', 'facade', 'terrace', 'mezzanine', 'office', '3d', 'floor plan', 'space', 'layout', 'fit-out', 'roof garden', 'epod']
  },
  {
    id: 'structural',
    label: 'Civil & Structural Integrity',
    color: '#f59e0b', // Amber/Gold
    keywords: ['foundation', 'excavation', 'pillar', 'corrosion', 'structural', 'beam', 'trial pit', 'load', 'column', 'steelwork', 'soil']
  },
  {
    id: 'mep_hvac',
    label: 'MEP & HVAC Services',
    color: '#10b981', // Emerald/Green
    keywords: ['mep', 'hvac', 'condenser', 'wet services', 'electrical', 'plumbing', 'ventilation', 'ac', 'air conditioning', 'capacity']
  },
  {
    id: 'governance',
    label: 'Budget & Scope Governance',
    color: '#8b5cf6', // Purple
    keywords: ['budget', 'scope', 'cost', 'r8m', 'r12m', 'seloxis', 'stage 3', 'freeze', 'council', 'submission', 'sign-off', 'financial', 'cap']
  },
  {
    id: 'operations',
    label: 'Team & Operations',
    color: '#06b6d4', // Cyan
    keywords: ['workflow', 'acc', 'minutes', 'weekly', 'schedule', 'communication', 'coordination', 'assignee', 'revisions']
  }
];

/**
 * Get domain focus spectrum per meeting and across project timeline.
 */
export function getDomainFocusSpectrum() {
  const meetings = db.prepare(`SELECT id, title, date FROM meeting_metadata ORDER BY date ASC`).all();
  const decisions = db.prepare(`SELECT meeting_id, impact_area, summary, theme FROM decisions_taken`).all();
  const risks = db.prepare(`SELECT meeting_id, description, contingency_measure FROM risk_raised`).all();
  const actions = db.prepare(`SELECT meeting_id, description FROM action_items`).all();
  const chunks = db.prepare(`SELECT meeting_id, content FROM vector_chunks`).all();

  const meetingSpectrum = meetings.map(m => {
    // Collect all text associated with this meeting
    const mDecisions = decisions.filter(d => d.meeting_id === m.id).map(d => `${d.impact_area} ${d.summary} ${d.theme}`).join(' ');
    const mRisks = risks.filter(r => r.meeting_id === m.id).map(r => `${r.description} ${r.contingency_measure || ''}`).join(' ');
    const mActions = actions.filter(a => a.meeting_id === m.id).map(a => a.description).join(' ');
    const mChunks = chunks.filter(c => c.meeting_id === m.id).map(c => c.content).join(' ');

    const combinedText = `${mDecisions} ${mRisks} ${mActions} ${mChunks}`.toLowerCase();

    const domainScores = {};
    let totalScore = 0;

    DOMAIN_DEFINITIONS.forEach(dom => {
      let score = 0;
      dom.keywords.forEach(kw => {
        const matches = (combinedText.match(new RegExp(kw, 'g')) || []).length;
        score += matches;
      });
      domainScores[dom.id] = score;
      totalScore += score;
    });

    // Normalize to percentages
    const percentages = {};
    DOMAIN_DEFINITIONS.forEach(dom => {
      percentages[dom.id] = totalScore > 0 ? Math.round((domainScores[dom.id] / totalScore) * 100) : 0;
    });

    return {
      meeting_id: m.id,
      title: m.title,
      date: m.date,
      total_keyword_hits: totalScore,
      percentages,
      scores: domainScores
    };
  });

  // Calculate overall project domain breakdown
  const overallScores = {};
  let overallTotal = 0;

  DOMAIN_DEFINITIONS.forEach(dom => {
    let sum = 0;
    meetingSpectrum.forEach(ms => {
      sum += ms.scores[dom.id];
    });
    overallScores[dom.id] = sum;
    overallTotal += sum;
  });

  const overallPercentages = {};
  DOMAIN_DEFINITIONS.forEach(dom => {
    overallPercentages[dom.id] = overallTotal > 0 ? Math.round((overallScores[dom.id] / overallTotal) * 100) : 0;
  });

  return {
    domains: DOMAIN_DEFINITIONS.map(d => ({ id: d.id, label: d.label, color: d.color })),
    meetingSpectrum,
    overallPercentages
  };
}

/**
 * Get Action Item Velocity and Stakeholder Capacity Matrix.
 */
export function getActionVelocityAndCapacity() {
  const meetings = db.prepare(`SELECT id, title, date FROM meeting_metadata ORDER BY date ASC`).all();
  const actions = db.prepare(`
    SELECT a.*, m.date as meeting_date
    FROM action_items a
    JOIN meeting_metadata m ON a.meeting_id = m.id
    ORDER BY m.date ASC, a.id ASC
  `).all();

  // Compute velocity per meeting
  let cumulativeTotal = 0;
  let cumulativeCompleted = 0;
  let cumulativeInProgress = 0;
  let cumulativePending = 0;

  const timelineVelocity = meetings.map(m => {
    const mActions = actions.filter(a => a.meeting_id === m.id);
    const created = mActions.length;
    const completed = mActions.filter(a => a.status === 'Completed').length;
    const inProgress = mActions.filter(a => a.status === 'In Progress').length;
    const pending = mActions.filter(a => a.status === 'Pending').length;

    cumulativeTotal += created;
    cumulativeCompleted += completed;
    cumulativeInProgress += inProgress;
    cumulativePending += pending;

    return {
      meeting_id: m.id,
      date: m.date,
      title: m.title,
      created,
      completed,
      inProgress,
      pending,
      cumulativeTotal,
      cumulativeCompleted,
      completionRate: created > 0 ? Math.round((completed / created) * 100) : 0
    };
  });

  // Stakeholder Capacity & Workload Breakdown
  const stakeholders = db.prepare(`SELECT * FROM stakeholders ORDER BY id ASC`).all();
  
  const capacityMatrix = stakeholders.map(s => {
    const sNameLower = s.name.toLowerCase();
    const firstName = sNameLower.split(' ')[0];

    const sActions = actions.filter(a => {
      if (!a.assignee) return false;
      const assignLower = a.assignee.toLowerCase();
      return assignLower.includes(sNameLower) || assignLower.includes(firstName);
    });

    const total = sActions.length;
    const completed = sActions.filter(a => a.status === 'Completed').length;
    const inProgress = sActions.filter(a => a.status === 'In Progress').length;
    const pending = sActions.filter(a => a.status === 'Pending').length;
    const loadScore = (inProgress * 1.5) + (pending * 2) + (total * 0.5);

    return {
      id: s.id,
      name: s.name,
      role: s.role,
      organization: s.organization,
      actionsAssigned: total,
      completed,
      inProgress,
      pending,
      workloadRisk: loadScore > 8 ? 'High' : loadScore > 4 ? 'Medium' : 'Low',
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      assignedItems: sActions.map(a => ({
        id: a.id,
        action_code: a.action_code,
        description: a.description,
        status: a.status,
        meeting_id: a.meeting_id
      }))
    };
  }).filter(s => s.actionsAssigned > 0 || s.role.includes('Lead') || s.role.includes('Manager'));

  return {
    summary: {
      totalActions: actions.length,
      completed: actions.filter(a => a.status === 'Completed').length,
      inProgress: actions.filter(a => a.status === 'In Progress').length,
      pending: actions.filter(a => a.status === 'Pending').length,
      overallCompletionPercentage: Math.round((actions.filter(a => a.status === 'Completed').length / actions.length) * 100)
    },
    timelineVelocity,
    capacityMatrix
  };
}

/**
 * Get Risk Lifecycle Trajectory across meetings.
 */
export function getRiskLifecycleTrajectory() {
  const meetings = db.prepare(`SELECT id, title, date FROM meeting_metadata ORDER BY date ASC`).all();
  const risks = db.prepare(`
    SELECT r.*, m.date as meeting_date, m.title as meeting_title
    FROM risk_raised r
    JOIN meeting_metadata m ON r.meeting_id = m.id
    ORDER BY m.date ASC
  `).all();

  const trajectory = meetings.map(m => {
    const mRisks = risks.filter(r => r.meeting_id === m.id);
    const high = mRisks.filter(r => r.impact_level === 'High').length;
    const medium = mRisks.filter(r => r.impact_level === 'Medium').length;
    const low = mRisks.filter(r => r.impact_level === 'Low').length;
    const open = mRisks.filter(r => r.status === 'Open').length;
    const closed = mRisks.filter(r => r.status === 'Closed').length;

    return {
      meeting_id: m.id,
      date: m.date,
      title: m.title,
      totalRaised: mRisks.length,
      high,
      medium,
      low,
      open,
      closed,
      risks: mRisks
    };
  });

  return {
    totalRisks: risks.length,
    openRisksCount: risks.filter(r => r.status === 'Open').length,
    closedRisksCount: risks.filter(r => r.status === 'Closed').length,
    highImpactCount: risks.filter(r => r.impact_level === 'High').length,
    trajectory,
    allRisks: risks
  };
}

/**
 * Build interactive Node & Edge data for the Causal Decision & Risk Graph Visualizer.
 */
export function getCausalDecisionGraph() {
  const meetings = db.prepare(`SELECT id, title, date FROM meeting_metadata ORDER BY date ASC`).all();
  const decisions = db.prepare(`SELECT d.*, m.date as meeting_date FROM decisions_taken d JOIN meeting_metadata m ON d.meeting_id = m.id`).all();
  const risks = db.prepare(`SELECT r.*, m.date as meeting_date FROM risk_raised r JOIN meeting_metadata m ON r.meeting_id = m.id`).all();
  const actions = db.prepare(`SELECT a.*, m.date as meeting_date FROM action_items a JOIN meeting_metadata m ON a.meeting_id = m.id`).all();
  const stakeholders = db.prepare(`SELECT * FROM stakeholders`).all();

  const nodes = [];
  const links = [];

  // Add Meeting Nodes
  meetings.forEach((m) => {
    nodes.push({
      id: `m_${m.id}`,
      label: m.id,
      fullTitle: m.title,
      date: m.date,
      type: 'meeting',
      group: 'Meeting',
      color: '#3b82f6', // Blue
      size: 24,
      details: `Meeting Date: ${m.date}\nTitle: ${m.title}`
    });
  });

  // Add Decision Nodes & Edges
  decisions.forEach(d => {
    const nodeId = `d_${d.id}`;
    nodes.push({
      id: nodeId,
      label: `DEC-${d.decision_num} (${d.meeting_id})`,
      fullTitle: d.summary,
      impactArea: d.impact_area,
      theme: d.theme || 'General',
      type: 'decision',
      group: 'Decision',
      color: '#8b5cf6', // Purple
      size: 18,
      meeting_id: d.meeting_id,
      details: `Impact Area: ${d.impact_area}\nTheme: ${d.theme}\n${d.summary}`
    });

    // Link Meeting -> Decision
    links.push({
      source: `m_${d.meeting_id}`,
      target: nodeId,
      relation: 'produced',
      label: 'Produced Decision',
      color: '#8b5cf6'
    });

    // Cross-decision correlations
    if (d.correlations) {
      try {
        const corrs = JSON.parse(d.correlations);
        corrs.forEach(c => {
          if (c.target_id) {
            links.push({
              source: nodeId,
              target: `d_${c.target_id}`,
              relation: c.relation_type || 'correlates',
              label: c.reason || 'Correlated Decision',
              color: '#a855f7'
            });
          }
        });
      } catch (e) {}
    }
  });

  // Add Risk Nodes & Edges
  risks.forEach(r => {
    const nodeId = `r_${r.id}`;
    const isHigh = r.impact_level === 'High';
    const isClosed = r.status === 'Closed';

    nodes.push({
      id: nodeId,
      label: r.risk_code || `RSK-${r.id}`,
      fullTitle: r.description,
      impact: r.impact_level,
      likelihood: r.likelihood,
      status: r.status,
      type: 'risk',
      group: 'Risk',
      color: isClosed ? '#10b981' : isHigh ? '#ef4444' : '#f59e0b',
      size: 16,
      meeting_id: r.meeting_id,
      details: `Impact: ${r.impact_level} | Likelihood: ${r.likelihood} | Status: ${r.status}\n${r.description}`
    });

    // Link Meeting -> Risk
    links.push({
      source: `m_${r.meeting_id}`,
      target: nodeId,
      relation: 'identified',
      label: 'Raised Risk',
      color: '#ef4444'
    });

    // Connect decisions that address/relate to risks
    const descLower = r.description.toLowerCase();
    decisions.forEach(d => {
      const dText = `${d.impact_area} ${d.summary}`.toLowerCase();
      if (
        (descLower.includes('fire') && dText.includes('fire')) ||
        (descLower.includes('lift') && dText.includes('lift')) ||
        (descLower.includes('budget') && dText.includes('budget')) ||
        (descLower.includes('staircase') && dText.includes('staircase')) ||
        (descLower.includes('corrosion') && dText.includes('foundation')) ||
        (descLower.includes('hvac') && dText.includes('air conditioning'))
      ) {
        links.push({
          source: `d_${d.id}`,
          target: nodeId,
          relation: 'mitigates',
          label: 'Mitigates Risk',
          color: '#10b981'
        });
      }
    });
  });

  // Add Stakeholders and Action links
  stakeholders.forEach(s => {
    const nodeId = `s_${s.id}`;
    const sNameLower = s.name.toLowerCase();
    const firstName = sNameLower.split(' ')[0];

    const sActions = actions.filter(a => a.assignee && a.assignee.toLowerCase().includes(firstName));

    if (sActions.length > 0) {
      nodes.push({
        id: nodeId,
        label: s.name.split(' ')[0],
        fullTitle: `${s.name} (${s.role})`,
        organization: s.organization,
        type: 'stakeholder',
        group: 'Stakeholder',
        color: '#06b6d4',
        size: 20,
        details: `Role: ${s.role} | Org: ${s.organization}\nActions Assigned: ${sActions.length}`
      });

      // Link Stakeholder -> Actions
      sActions.forEach(a => {
        const actNodeId = `a_${a.id}`;
        if (!nodes.some(n => n.id === actNodeId)) {
          nodes.push({
            id: actNodeId,
            label: a.action_code || `ACT-${a.id}`,
            fullTitle: a.description,
            status: a.status,
            type: 'action',
            group: 'Action',
            color: a.status === 'Completed' ? '#10b981' : '#f97316',
            size: 14,
            meeting_id: a.meeting_id,
            details: `Status: ${a.status} | Assignee: ${a.assignee}\n${a.description}`
          });

          // Link Meeting -> Action
          links.push({
            source: `m_${a.meeting_id}`,
            target: actNodeId,
            relation: 'created',
            label: 'Created Action',
            color: '#f97316'
          });
        }

        // Link Stakeholder -> Action
        links.push({
          source: nodeId,
          target: actNodeId,
          relation: 'assigned',
          label: 'Assigned To',
          color: '#06b6d4'
        });
      });
    }
  });

  return {
    nodesCount: nodes.length,
    linksCount: links.length,
    nodes,
    links
  };
}

/**
 * Get Retrospective & Project Experience Quadrant Knowledge.
 */
export function getProjectRetrospective() {
  const wins = [
    {
      title: 'Mandatory Stage 3 Freeze & Sign-Off Protocol',
      category: 'Governance',
      meeting: 'Minutes01',
      description: 'Freezing design plans and cost estimates at Stage 3 sign-off successfully prevented costly downstream scope sprawl.',
      takeaway: 'Mandate formal stage sign-offs early to lock spatial configurations before detail drawings begin.'
    },
    {
      title: 'Single-Platform Standard: Revit & ACC Integration',
      category: 'BIM & Process',
      meeting: 'Minutes01',
      description: 'Standardizing communication and model sharing on ACC eliminated file fragmentation and version confusion.',
      takeaway: 'Enforce single cloud repository standards across all architectural and MEP sub-consultants from Day 1.'
    },
    {
      title: 'Proactive Fire Safety Engagement with Fire Chief',
      category: 'Compliance',
      meeting: 'Minutes00',
      description: 'Presenting high-level conceptual fire strategy to municipal officials prior to full submission avoided major plan rejections.',
      takeaway: 'Engage municipal fire and building inspectors early with conceptual frameworks before drawing formal submittals.'
    }
  ];

  const frictionPoints = [
    {
      title: 'Delayed Corrosion Protection Methodology',
      category: 'Structural',
      meeting: 'Minutes05',
      description: 'Uncertainty around ground/first-floor beam corrosion treatments bottlenecked site foundation progress (RSK-011).',
      takeaway: 'Conduct material corrosion and environmental exposure assessments during preliminary site investigation.'
    },
    {
      title: 'High Occupancy Staircase Width Constraints',
      category: 'Architectural / Egress',
      meeting: 'Minutes00 & Minutes04',
      description: 'Rooftop occupancy calculations threatened to mandate a 1.8m wide staircase, taking up premium floor space on lower levels.',
      takeaway: 'Calculate maximum roof terrace occupancy limits early to balance spatial efficiency with egress stair width rules.'
    },
    {
      title: 'Late Budget vs Scope Alignment Friction',
      category: 'Financial',
      meeting: 'Minutes01 & Minutes04',
      description: 'Wishlist additions (full gym, multi-floor buildouts) initially pushed cost projections over the R8M–R12M envelope.',
      takeaway: 'Integrate real-time cost estimators into bi-weekly design syncs to curtail scope creep.'
    }
  ];

  const pivotPoints = [
    {
      title: 'Excluding Lift Replacement from Primary Capital Budget',
      category: 'Scope Control',
      meeting: 'Minutes01',
      description: 'Decided against upgrading existing lift structure; adopted emergency chair escape protocols to save massive excavation cost.',
      takeaway: 'Evaluate operational procedural workarounds (e.g. emergency evacuation procedures) before committing to heavy capital works.'
    },
    {
      title: 'Rooftop EPOD Manual Test Pit Requirement',
      category: 'Engineering Verification',
      meeting: 'Minutes02 & Minutes05',
      description: 'Pivoted from theoretical roof capacity calculations to mandatory physical foundation trial pits before committing rooftop weight.',
      takeaway: 'Never rely on legacy building drawings; mandate physical destructive test pits before structural additions.'
    },
    {
      title: 'Limiting Fit-out Scope to First 2 Floors',
      category: 'Commercial Phasing',
      meeting: 'Minutes01',
      description: 'Submitted full building for municipal approval while phasing construction fit-out strictly to ground and first floors.',
      takeaway: 'Separate building planning submission boundaries from phased construction fit-out packages.'
    }
  ];

  const reusableStandards = [
    {
      title: 'Multi-Building Unified Fire Strategy Template',
      category: 'Fire Safety Standard',
      description: 'Standard protocol treating multi-structure office campuses under one holistic fire submission rather than fragmented filings.'
    },
    {
      title: 'Pre-Rooftop Load Verification Protocol',
      category: 'Structural Standard',
      description: 'Standard checklist requiring ground trial pit excavation, pillar capacity audit, and steel corrosion check before rooftop HVAC/EPOD design.'
    },
    {
      title: 'Bi-Weekly Multi-Disciplinary Action Matrix',
      category: 'Project Management Standard',
      description: 'Standardized action item coding system with strict assignee load balancing across architectural, MEP, and civil leads.'
    }
  ];

  return {
    quadrants: {
      wins,
      frictionPoints,
      pivotPoints,
      reusableStandards
    },
    executivePostMortem: `Uppercamp HQ (prj041) demonstrates key lessons in balancing commercial wishlist demands with structural baseline constraints. The project successfully avoided catastrophic budget overruns by establishing early Revit/ACC BIM standards, adopting a phased 2-floor interior fit-out strategy, and engaging municipal fire authorities conceptually. Future capital projects (prj042+) should embed mandatory physical foundation test pits prior to rooftop engineering design.`
  };
}
