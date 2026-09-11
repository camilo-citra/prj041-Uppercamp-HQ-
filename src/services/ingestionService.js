import fs from 'fs';
import path from 'path';
import db, { resetDatabase } from '../db/index.js';
import { parseMeetingMarkdown, parseMeetingMarkdownWithFallback } from '../parser/meetingParser.js';
import { indexMeetingChunks } from '../rag/vectorStore.js';
import { analyzeAndMapDecisions } from './decisionIntelligenceService.js';
import { runProjectAnalysis } from '../agent/projectAnalysisAgent.js';

export function cleanAndNormalizeName(rawName) {
  if (!rawName) return '';
  let name = rawName;
  
  // Remove parenthetical details: e.g. "Camilo Mogni (Project Manager)" -> "Camilo Mogni"
  name = name.replace(/\([^)]*\)/g, '');
  // Remove bracket details: e.g. "Camilo Mogni [PM]" -> "Camilo Mogni"
  name = name.replace(/\[[^\]]*\]/g, '');
  // Strip markdown formatting symbols (*, _, `, #, ~)
  name = name.replace(/[\*\_\`\#\~]/g, '');
  // Strip leading bullet symbols, numbers, dashes, asterisks, spaces, colons
  name = name.replace(/^[\s\-\–\—•\*\d\.\:\)\(]+/, '');
  // Strip trailing punctuation & spaces
  name = name.replace(/[\s\-\–\—•\*\.\:\)\(]+$/, '');
  
  // Collapse whitespace
  return name.replace(/\s+/g, ' ').trim();
}

export function splitAttendees(attendeesStr) {
  if (!attendeesStr) return [];
  const tokens = [];
  let current = '';
  let inParen = 0;
  for (let i = 0; i < attendeesStr.length; i++) {
    const char = attendeesStr[i];
    if (char === '(' || char === '[') inParen++;
    else if (char === ')' || char === ']') inParen = Math.max(0, inParen - 1);

    if ((char === ',' || char === ';' || char === '\n') && inParen === 0) {
      if (current.trim()) tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

export function findMatchingStakeholder(cleanName, existingStakeholders) {
  if (!cleanName || cleanName.length < 2) return null;

  const normClean = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!normClean) return null;

  // 1. Direct exact or normalized name match
  for (const s of existingStakeholders) {
    const normExisting = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normClean === normExisting) {
      return s;
    }
  }

  // 2. Substring / First Name / Full Name match against existing team
  // e.g. cleanName "Pieter" matches "Pieter Fourie", "Enrica" matches "Enrica van der Linden", "Lunell" matches "Lunell de Blanche", "Camilo" matches "Camilo Mogni"
  for (const s of existingStakeholders) {
    const existingParts = s.name.toLowerCase().split(/\s+/);
    const cleanParts = cleanName.toLowerCase().split(/\s+/);

    if (cleanParts.length === 1 && cleanParts[0].length >= 3 && existingParts[0] === cleanParts[0]) {
      return s;
    }
    if (existingParts.length === 1 && existingParts[0].length >= 3 && cleanParts[0] === existingParts[0]) {
      return s;
    }
  }

  return null;
}

export async function ingestAllMeetings(rawDirectoryPath) {
  resetDatabase();

  const files = fs.readdirSync(rawDirectoryPath)
    .filter(file => file.endsWith('.md') && file.toLowerCase().includes('minutes'))
    .sort(); // Sort files e.g. Minutes00, Minutes01, Minutes02, Minutes03, Minutes04

  console.log(`Found ${files.length} meeting minute files to ingest.`);

  const parsedMeetings = [];
  for (const file of files) {
    const fullPath = path.join(rawDirectoryPath, file);
    const parsed = await parseMeetingMarkdownWithFallback(fullPath);
    parsedMeetings.push(parsed);
  }

  // Sort chronologically by date
  parsedMeetings.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Deduplicate meeting IDs across parsed files to prevent constraint collisions
  const seenIds = new Set();
  for (const mtg of parsedMeetings) {
    if (seenIds.has(mtg.id)) {
      let counter = 2;
      let candidateId = `${mtg.id}_${counter}`;
      while (seenIds.has(candidateId)) {
        counter++;
        candidateId = `${mtg.id}_${counter}`;
      }
      console.warn(`[Ingestion] Duplicate meeting ID detected for "${mtg.raw_file_name}". Assigning unique ID: "${candidateId}"`);
      mtg.id = candidateId;
    }
    seenIds.add(mtg.id);
  }

  // Determine latest meeting for dynamic Brief update
  const latestMtg = parsedMeetings.length > 0 ? parsedMeetings[parsedMeetings.length - 1] : null;
  const latestMtgId = latestMtg ? latestMtg.id : 'Minutes00';
  const dynamicObjective = (latestMtg && latestMtg.executive_summary)
    ? `[Updated from ${latestMtg.id}] ${latestMtg.executive_summary.slice(0, 220).replace(/\n/g, ' ')}...`
    : 'Deliver multi-floor phased renovation, exterior facade modernization, and roof terrace development for Uppercamp HQ within budget and compliance standards.';

  // Initialize living Project Brief table
  const insertBriefStmt = db.prepare(`
    INSERT INTO brief (id, title, objective, core_requirements, last_updated_meeting_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertBriefStmt.run(
    1,
    'prj041 - Uppercamp HQ (UC 6A Renovation & Roof Terrace)',
    dynamicObjective,
    'Scope: Council submission covering 3 floors + facade + roof. Interior fit-out restricted to Floors 1 & 2. Governance via Revit + ACC platform. Stage 3 sign-offs required to lock budget.',
    latestMtgId
  );

  const insertMeetingMetaStmt = db.prepare(`
    INSERT OR REPLACE INTO meeting_metadata (
      id, title, date, time, location, pm, attendees, apologies, raw_file_name, gemini_link, executive_summary, raw_markdown
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDecisionStmt = db.prepare(`
    INSERT INTO decisions_taken (decision_num, impact_area, summary, meeting_id)
    VALUES (?, ?, ?, ?)
  `);

  const insertActionStmt = db.prepare(`
    INSERT INTO action_items (item_num, action_code, description, assignee, due_date, status, meeting_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertRiskStmt = db.prepare(`
    INSERT INTO risk_raised (risk_code, description, contingency_measure, impact_level, likelihood, status, meeting_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAssumptionStmt = db.prepare(`
    INSERT INTO assumptions (asm_code, description, category, status, updated_meeting_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertDependencyStmt = db.prepare(`
    INSERT INTO dependencies (dep_code, description, predecessor, successor, status, meeting_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let globalRiskCounter = 1;
  let globalActionCounter = 1;

  db.transaction(() => {
    for (const mtg of parsedMeetings) {
      insertMeetingMetaStmt.run(
        mtg.id,
        mtg.title,
        mtg.date,
        mtg.time,
        mtg.location,
        mtg.pm,
        mtg.attendees,
        mtg.apologies,
        mtg.raw_file_name,
        mtg.gemini_link,
        mtg.executive_summary,
        mtg.raw_markdown
      );

      for (const dec of mtg.decisions) {
        insertDecisionStmt.run(dec.num, dec.impact_area, dec.summary, mtg.id);
      }

      for (const act of mtg.action_items) {
        const actionCode = act.action_code || `ACT-${String(globalActionCounter++).padStart(3, '0')}`;
        insertActionStmt.run(act.num, actionCode, act.description, act.assignee, act.due_date, act.status, mtg.id);
      }

      for (const rsk of mtg.risks) {
        const riskCode = rsk.risk_code || `RSK-${String(globalRiskCounter++).padStart(3, '0')}`;
        insertRiskStmt.run(riskCode, rsk.description, rsk.contingency_measure, rsk.impact_level, rsk.likelihood, rsk.status || 'Open', mtg.id);
      }

      for (const asmp of mtg.assumptions) {
        insertAssumptionStmt.run(asmp.asm_code || null, asmp.description, asmp.category, asmp.status, mtg.id);
      }

      if (mtg.dependencies) {
        for (const dep of mtg.dependencies) {
          insertDependencyStmt.run(dep.dep_code, dep.description, dep.predecessor, dep.successor, dep.status, mtg.id);
        }
      }

      // Build RAG vector chunks for this meeting
      indexMeetingChunks(mtg);
    }

    const insertStakeholderStmt = db.prepare(`
      INSERT OR REPLACE INTO stakeholders (name, role, organization, key_responsibilities, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const coreStakeholders = [
      { name: 'Camilo Mogni', role: 'Project Manager & Lead', organization: 'Citra Management', key_responsibilities: 'Overall project governance, Stage 3 concept freeze, budget alignment & stakeholder coordination', status: 'Active' },
      { name: 'John Walter Shaidi', role: 'Project Coordinator & Financial Model Lead', organization: 'Citra Management', key_responsibilities: 'Consultant cash flow modeling, master schedule tracking, and Seloxis alignment', status: 'Active' },
      { name: 'Kim Williams', role: 'Principal Interior Designer & Framework Lead', organization: 'Kim Williams Design', key_responsibilities: 'Behavioral neighborhood framework (Connect, Build, Inspire, Community) & layout design', status: 'Active' },
      { name: 'Pieter Fourie', role: 'Fire, Wet Services & Mechanical Lead Engineer', organization: 'Engineering Consultants', key_responsibilities: 'Fire safety egress compliance, 1200mm passage verification, staircase & MEP coordination', status: 'Active' },
      { name: 'Nicole Vivier', role: 'Interior Architectural Specialist', organization: 'Kim Williams Design', key_responsibilities: 'Section, mezzanine concepts, and detailed architectural development documentation', status: 'Active' },
      { name: 'Cheryl Hillman', role: 'Workspace Strategy & Operations Lead', organization: 'Citra Operations', key_responsibilities: 'Recurring coordination sessions, 10-seater boardroom passage optimization & desk ratios', status: 'Active' },
      { name: 'Jacques Kruger', role: 'Operations Director', organization: 'Citra Operations', key_responsibilities: 'Operational workflow alignment, ground floor logistics & facility space planning', status: 'Active' },
      { name: 'Joel Baur', role: 'Executive Director / Stakeholder Lead', organization: 'Citra Executive', key_responsibilities: 'Executive sign-off, Stage 3 brief finalization & strategic campus direction', status: 'Active' },
      { name: 'Realm Chitando', role: 'Commercial & Construction Lead', organization: 'Citra Construction', key_responsibilities: 'Office relocation plans, lift shaft usage decisions & billboard market trend research', status: 'Active' },
      { name: 'Nonhlanhla Mashego', role: 'Stakeholder & Project Operations', organization: 'Citra Management', key_responsibilities: 'Project administration, stakeholder communication & operational coordination', status: 'Active' },
      { name: 'Enrica van der Linden', role: 'Design & Space Planning Specialist', organization: 'Kim Williams Design', key_responsibilities: 'Detailed space planning, material selections & design documentation', status: 'Active' },
      { name: 'Lunell de Blanche', role: '3D Visualization & Design Specialist', organization: 'Kim Williams Design', key_responsibilities: 'Conceptual renderings, presentation materials & 3D layout modeling', status: 'Active' },
      { name: 'Busisiwe Mgwenya', role: 'Stakeholder Team Member', organization: 'Citra Management', key_responsibilities: 'Departmental requirements gathering & Stage 3 feedback review', status: 'Active' },
      { name: 'Farai Dhlamini', role: 'Stakeholder Team Member', organization: 'Citra Operations', key_responsibilities: 'Facility feedback & operational requirements alignment', status: 'Active' },
      { name: 'Lisha', role: 'Marketing Strategy & Collaboration Lead', organization: 'Citra Marketing', key_responsibilities: 'Proposed collaboration wall strategy & brand alignment', status: 'Active' }
    ];

    for (const s of coreStakeholders) {
      insertStakeholderStmt.run(s.name, s.role, s.organization, s.key_responsibilities, s.status);
    }

    // Auto-discover and register any new attendees found in parsed meetings cleanly
    const registeredStakeholders = [...coreStakeholders];
    for (const mtg of parsedMeetings) {
      if (!mtg.attendees) continue;
      const parsedTokens = splitAttendees(mtg.attendees);
      for (const token of parsedTokens) {
        const cleanName = cleanAndNormalizeName(token);
        if (!cleanName || cleanName.length < 2) continue;

        // Skip non-person words/phrases
        const lower = cleanName.toLowerCase();
        if (lower.includes('team') || lower.includes('department') || lower.includes('engineer)') || lower.includes('consultant')) continue;

        const match = findMatchingStakeholder(cleanName, registeredStakeholders);
        if (!match) {
          insertStakeholderStmt.run(cleanName, 'Project Team Member', 'Uppercamp Project Team', `Discovered as meeting participant in ${mtg.id}`, 'Active');
          registeredStakeholders.push({ name: cleanName, role: 'Project Team Member', organization: 'Uppercamp Project Team' });
        }
      }
    }
  })();

  // Run automated theme discovery and correlation mapping across decisions
  try {
    analyzeAndMapDecisions();
  } catch (err) {
    console.error('Decision analysis during ingestion warning:', err.message);
  }

  // Run automated continuous thematic and qualitative content analysis
  try {
    runProjectAnalysis('Ingestion Service Pipeline Complete');
  } catch (err) {
    console.error('Project analysis generation during ingestion warning:', err.message);
  }

  console.log('Successfully ingested all meeting minutes into SQLite, Vector Store, and regenerated Continuous Analysis.');
}

