import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db/index.js';
import { ingestAllMeetings } from '../services/ingestionService.js';
import { syncDbToRaw } from '../../scripts/sync_db_to_raw.js';
import { runProjectAnalysis } from './projectAnalysisAgent.js';
import { calculateProjectRoi } from '../services/financialRoiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rawDir = path.join(__dirname, '../../Raw');

let isProcessing = false;
let debounceTimeout = null;

export async function runIngestionPipeline(reason = 'Manual or Scheduled Trigger') {
  if (isProcessing) {
    console.log(`[MeetingIngestionAgent] Ingestion already in progress. Queueing event (${reason})...`);
    return;
  }

  isProcessing = true;
  const startTime = Date.now();
  console.log(`\n======================================================`);
  console.log(`🤖 [MeetingIngestionAgent] STARTING MEETING INGESTION AGENT PIPELINE`);
  console.log(`📌 Trigger Reason: ${reason}`);
  console.log(`⏱️ Timestamp: ${new Date().toISOString()}`);
  console.log(`======================================================`);

  try {
    // 1. Core Ingestion (Parses meetings, populates DB & RAG vector store)
    await ingestAllMeetings(rawDir);

    // 2. Bi-directional Sync back to Markdown files
    try {
      syncDbToRaw();
    } catch (syncErr) {
      console.error('[MeetingIngestionAgent] Warning during bi-directional raw sync:', syncErr.message);
    }

    // 3. Automatically regenerate Continuous Project Intelligence Analysis
    try {
      runProjectAnalysis(`Meeting Ingestion Pipeline Trigger (${reason})`);
    } catch (analysisErr) {
      console.error('[MeetingIngestionAgent] Warning during analysis regeneration:', analysisErr.message);
    }

    // 4. Extract metrics across all core modules
    const meetingCount = db.prepare('SELECT count(*) as count FROM meeting_metadata').get().count;
    const briefCount = db.prepare('SELECT count(*) as count FROM brief').get().count;
    const decisionCount = db.prepare('SELECT count(*) as count FROM decisions_taken').get().count;
    const actionCount = db.prepare('SELECT count(*) as count FROM action_items').get().count;
    const riskCount = db.prepare('SELECT count(*) as count FROM risk_raised').get().count;
    const assumptionCount = db.prepare('SELECT count(*) as count FROM assumptions').get().count;
    const stakeholderCount = db.prepare('SELECT count(*) as count FROM stakeholders').get().count;
    const vectorCount = db.prepare('SELECT count(*) as count FROM vector_chunks').get().count;

    // 5. Compute and log updated Financial ROI & Savings
    let roiMetrics = null;
    try {
      roiMetrics = calculateProjectRoi();
    } catch (roiErr) {
      console.error('[MeetingIngestionAgent] Warning during financial ROI recalculation:', roiErr.message);
    }

    const duration = Date.now() - startTime;
    console.log(`\n✅ [MeetingIngestionAgent] PIPELINE SUCCESSFULLY EXECUTED IN ${duration}ms`);
    console.log(`------------------------------------------------------`);
    console.log(` 📂 1. Meetings Ingested:        ${meetingCount}`);
    console.log(` 📋 2. Living Brief Entries:     ${briefCount}`);
    console.log(` ⏱️ 3. Decisions & Timeline:    ${decisionCount}`);
    console.log(` ✅ 4. Action Items Parsed:      ${actionCount}`);
    console.log(` 🛡️ 5. Risk Matrix & Issues:     ${riskCount}`);
    console.log(` 🔍 6. Assumptions Tracked:      ${assumptionCount}`);
    console.log(` 👥 7. Project Team / Roster:    ${stakeholderCount}`);
    console.log(` 🧠 8. RAG Vector Intelligence:  ${vectorCount} chunks`);
    console.log(` 📊 9. Continuous Analysis:      Regenerated & Cached`);
    if (roiMetrics) {
      console.log(` 💰 10. Financial Savings Protected: R${roiMetrics.savings.total.toLocaleString()} (${roiMetrics.savings.budgetDefenseRatePct}% of R12M CapEx)`);
    }
    console.log(`======================================================\n`);
  } catch (error) {
    console.error('❌ [MeetingIngestionAgent] ERROR DURING INGESTION:', error);
  } finally {
    isProcessing = false;
  }
}

export function startMeetingIngestionWatcher() {
  if (!fs.existsSync(rawDir)) {
    console.error(`[MeetingIngestionAgent] Error: Raw directory does not exist at ${rawDir}`);
    return;
  }

  console.log(`👀 [MeetingIngestionAgent] Watching directory for meeting ingestion: ${rawDir}`);

  // Initial ingestion run upon start
  runIngestionPipeline('Agent Startup Initial Sync');

  // File watcher
  fs.watch(rawDir, (eventType, filename) => {
    if (!filename || !filename.endsWith('.md')) return;

    if (debounceTimeout) clearTimeout(debounceTimeout);

    debounceTimeout = setTimeout(() => {
      runIngestionPipeline(`File Event (${eventType}): ${filename}`);
    }, 800);
  });
}

// Run directly if executed as standalone script
if (process.argv[1] && process.argv[1].endsWith('meetingIngestionAgent.js')) {
  const once = process.argv.includes('--once');
  if (once) {
    runIngestionPipeline('CLI --once Execution');
  } else {
    startMeetingIngestionWatcher();
  }
}
