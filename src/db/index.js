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
  console.log('Database schema initialized.');
}

export function resetDatabase() {
  db.exec(`
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
