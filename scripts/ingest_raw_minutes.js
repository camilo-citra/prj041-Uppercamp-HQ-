import path from 'path';
import { fileURLToPath } from 'url';
import db from '../src/db/index.js';
import { ingestAllMeetings } from '../src/services/ingestionService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDir = path.join(__dirname, '../Raw');

console.log('Starting Ingestion of Raw Meeting Minutes...');
ingestAllMeetings(rawDir);

// Verify row counts across all 6 core tables
const meetingCount = db.prepare('SELECT count(*) as count FROM meeting_metadata').get().count;
const briefCount = db.prepare('SELECT count(*) as count FROM brief').get().count;
const decisionCount = db.prepare('SELECT count(*) as count FROM decisions_taken').get().count;
const actionCount = db.prepare('SELECT count(*) as count FROM action_items').get().count;
const riskCount = db.prepare('SELECT count(*) as count FROM risk_raised').get().count;
const assumptionCount = db.prepare('SELECT count(*) as count FROM assumptions').get().count;
const vectorCount = db.prepare('SELECT count(*) as count FROM vector_chunks').get().count;

console.log('\n--- Ingestion Verification Summary ---');
console.log(`- Meetings Ingested: ${meetingCount}`);
console.log(`- Living Brief Entries: ${briefCount}`);
console.log(`- Decisions Recorded: ${decisionCount}`);
console.log(`- Action Items Parsed: ${actionCount}`);
console.log(`- Risks & Issues Logged: ${riskCount}`);
console.log(`- Assumptions Tracked: ${assumptionCount}`);
console.log(`- RAG Vector Chunks Indexed: ${vectorCount}`);
console.log('-------------------------------------\n');
