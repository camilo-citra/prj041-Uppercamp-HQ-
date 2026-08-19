import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../uppercamp_hq.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

export function initDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);

  // Auto-migrate decisions_taken columns if running on an existing DB
  try {
    const tableInfo = db.prepare("PRAGMA table_info(decisions_taken)").all();
    const colNames = tableInfo.map(c => c.name);
    if (!colNames.includes('theme')) {
      db.exec("ALTER TABLE decisions_taken ADD COLUMN theme TEXT DEFAULT 'General'");
    }
    if (!colNames.includes('correlations')) {
      db.exec("ALTER TABLE decisions_taken ADD COLUMN correlations TEXT DEFAULT '[]'");
    }
    if (!colNames.includes('rationale')) {
      db.exec("ALTER TABLE decisions_taken ADD COLUMN rationale TEXT DEFAULT ''");
    }
    if (!colNames.includes('updated_at')) {
      db.exec("ALTER TABLE decisions_taken ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    }
  } catch (err) {
    console.error('Migration warning for decisions_taken:', err.message);
  }

  console.log('Database schema initialized.');
}

export function resetDatabase() {
  db.exec(`
    DROP TABLE IF EXISTS stakeholders;
    DROP TABLE IF EXISTS dependencies;
    DROP TABLE IF EXISTS vector_chunks;
    DROP TABLE IF EXISTS assumptions;
    DROP TABLE IF EXISTS risk_raised;
    DROP TABLE IF EXISTS action_items;
    DROP TABLE IF EXISTS decisions_taken;
    DROP TABLE IF EXISTS meeting_metadata;
    DROP TABLE IF EXISTS brief;
  `);
  initDatabase();
}

export default db;
