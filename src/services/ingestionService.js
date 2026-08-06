import fs from 'fs';
import path from 'path';
import db, { resetDatabase } from '../db/index.js';
import { parseMeetingMarkdown } from '../parser/meetingParser.js';
import { indexMeetingChunks } from '../rag/vectorStore.js';

export function ingestAllMeetings(rawDirectoryPath) {
  resetDatabase();

  const files = fs.readdirSync(rawDirectoryPath)
    .filter(file => file.endsWith('.md') && file.toLowerCase().includes('minutes'))
    .sort(); // Sort files e.g. Minutes00, Minutes01, Minutes02, Minutes03, Minutes04

  console.log(`Found ${files.length} meeting minute files to ingest.`);

  const parsedMeetings = [];
  for (const file of files) {
    const fullPath = path.join(rawDirectoryPath, file);
    const parsed = parseMeetingMarkdown(fullPath);
    parsedMeetings.push(parsed);
  }

  // Sort chronologically by date
  parsedMeetings.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Initialize living Project Brief table
  const insertBriefStmt = db.prepare(`
    INSERT INTO brief (id, title, objective, core_requirements, last_updated_meeting_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertBriefStmt.run(
    1,
    'prj041 - Uppercamp HQ (UC 6A Renovation & Roof Terrace)',
    'Deliver multi-floor phased renovation, exterior facade modernization, and roof terrace development for Uppercamp HQ within budget and compliance standards.',
    'Scope: Council submission covering 3 floors + facade + roof. Interior fit-out restricted to Floors 1 & 2. Governance via Revit + ACC platform. Stage 3 sign-offs required to lock budget.',
    'Minutes04'
  );

  const insertMeetingMetaStmt = db.prepare(`
    INSERT INTO meeting_metadata (
      id, title, date, time, location, pm, attendees, apologies, raw_file_name, gemini_link, executive_summary, raw_markdown
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDecisionStmt = db.prepare(`
    INSERT INTO decisions_taken (decision_num, impact_area, summary, meeting_id)
    VALUES (?, ?, ?, ?)
  `);

  const insertActionStmt = db.prepare(`
    INSERT INTO action_items (item_num, description, assignee, due_date, status, meeting_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertRiskStmt = db.prepare(`
    INSERT INTO risk_raised (description, contingency_measure, impact_level, likelihood, meeting_id)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertAssumptionStmt = db.prepare(`
    INSERT INTO assumptions (description, category, status, updated_meeting_id)
    VALUES (?, ?, ?, ?)
  `);

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
        insertActionStmt.run(act.num, act.description, act.assignee, act.due_date, act.status, mtg.id);
      }

      for (const rsk of mtg.risks) {
        insertRiskStmt.run(rsk.description, rsk.contingency_measure, rsk.impact_level, rsk.likelihood, mtg.id);
      }

      for (const asmp of mtg.assumptions) {
        insertAssumptionStmt.run(asmp.description, asmp.category, asmp.status, mtg.id);
      }

      // Build RAG vector chunks for this meeting
      indexMeetingChunks(mtg);
    }
  })();

  console.log('Successfully ingested all meeting minutes into SQLite and Vector Store.');
}
