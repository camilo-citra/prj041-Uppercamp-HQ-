import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { extractMeetingId } from '../src/parser/meetingParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function syncDbToRaw() {
  const dbPath = path.join(__dirname, '../uppercamp_hq.db');
  const rawDir = path.join(__dirname, '../Raw');

  if (!fs.existsSync(dbPath) || !fs.existsSync(rawDir)) return;

  const db = new Database(dbPath);
  const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.md')).sort();

  console.log('=== SYNCING DB ACTION ITEMS & RISKS TO RAW MARKDOWN FILES ===\n');

  let totalUpdatedFiles = 0;
  let totalUpdatedRows = 0;

  for (const file of files) {
    const fullPath = path.join(rawDir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    const meetingId = extractMeetingId(file);

    const dbActions = db.prepare('SELECT item_num, action_code, assignee, status, description FROM action_items WHERE meeting_id = ? ORDER BY item_num ASC').all(meetingId);
    const dbRisks = db.prepare('SELECT id, risk_code, description, status FROM risk_raised WHERE meeting_id = ? ORDER BY id ASC').all(meetingId);

    let fileModified = false;
    let lines = content.split('\n');

    let inActionSection = false;
    let actionHeaderFound = false;
    let actionRowIdx = 0;

    let inRiskSection = false;
    let riskHeaderFound = false;
    let riskRowIdx = 0;

    lines = lines.map((line) => {
      const trimmed = line.trim();

      // Section markers
      if (/^#+\s*.*Action Items/i.test(trimmed)) {
        inActionSection = true;
        inRiskSection = false;
        actionHeaderFound = false;
        actionRowIdx = 0;
        return line;
      }

      if (/^#+\s*.*(Risk Register|Risks, Issues|Risks)/i.test(trimmed)) {
        inRiskSection = true;
        inActionSection = false;
        riskHeaderFound = false;
        riskRowIdx = 0;
        return line;
      }

      if ((inActionSection || inRiskSection) && trimmed.startsWith('#') && !trimmed.toLowerCase().includes('risk') && !trimmed.toLowerCase().includes('action')) {
        inActionSection = false;
        inRiskSection = false;
        return line;
      }

      // Sync Action Items Table
      if (inActionSection && trimmed.includes('|')) {
        if (trimmed.toLowerCase().includes('task') || trimmed.toLowerCase().includes('action item') || trimmed.includes(':----')) {
          actionHeaderFound = true;
          return line;
        }

        if (actionHeaderFound) {
          actionRowIdx++;
          const dbItem = dbActions.find(r => r.item_num === actionRowIdx);
          if (dbItem) {
            const parts = line.split('|');
            if (parts.length >= 4) {
              const currentStatusCell = parts[parts.length - 2].trim();
              if (currentStatusCell.toLowerCase() !== dbItem.status.toLowerCase()) {
                parts[parts.length - 2] = ` ${dbItem.status} `;
                line = parts.join('|');
                fileModified = true;
                totalUpdatedRows++;
                console.log(`  [${meetingId}] Action Item #${dbItem.item_num}: "${currentStatusCell}" -> "${dbItem.status}"`);
              }
            }
          }
        }
      }

      // Sync Risk Table or Bullet Points
      if (inRiskSection) {
        if (trimmed.includes('|')) {
          if (trimmed.toLowerCase().includes('risk name')) {
            riskHeaderFound = true;
            const cols = line.split('|');
            if (cols.length === 5 && !trimmed.toLowerCase().includes('status')) {
              line = `${line.trim()} Status |`;
              fileModified = true;
            }
            return line;
          }
          if (trimmed.includes(':----')) {
            const cols = line.split('|');
            if (cols.length === 5 && !cols[3].includes(':----')) {
              line = `${line.trim()} :---- |`;
              fileModified = true;
            }
            return line;
          }

          if (riskHeaderFound) {
            riskRowIdx++;
            const dbRisk = dbRisks[riskRowIdx - 1];
            if (dbRisk) {
              const parts = line.split('|');
              if (parts.length === 5) {
                parts.splice(parts.length - 1, 0, ` ${dbRisk.status} `);
                line = parts.join('|');
                fileModified = true;
                totalUpdatedRows++;
                console.log(`  [${meetingId}] Added Risk status column for (${dbRisk.risk_code}): "${dbRisk.status}"`);
              } else if (parts.length >= 6) {
                const currentStatusCell = parts[parts.length - 2].trim();
                if (currentStatusCell.toLowerCase() !== dbRisk.status.toLowerCase()) {
                  parts[parts.length - 2] = ` ${dbRisk.status} `;
                  line = parts.join('|');
                  fileModified = true;
                  totalUpdatedRows++;
                  console.log(`  [${meetingId}] Risk (${dbRisk.risk_code}): "${currentStatusCell}" -> "${dbRisk.status}"`);
                }
              }
            }
          }
        } else if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
          const matchRisk = dbRisks.find(r => trimmed.toLowerCase().includes(r.description.slice(0, 25).toLowerCase()));
          if (matchRisk) {
            const statusTag = `(Status: ${matchRisk.status})`;
            if (!trimmed.includes(statusTag)) {
              line = line.replace(/\s*\(Status:\s*(Open|Closed)\)/gi, '');
              line = `${line.trimEnd()} ${statusTag}`;
              fileModified = true;
              totalUpdatedRows++;
              console.log(`  [${meetingId}] Risk Bullet (${matchRisk.risk_code}): Updated to ${statusTag}`);
            }
          }
        }
      }

      return line;
    });

    if (fileModified) {
      fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
      totalUpdatedFiles++;
      console.log(`✅ Saved updates to ${file}\n`);
    }
  }

  console.log(`=== SYNC COMPLETE: ${totalUpdatedRows} statuses synced across ${totalUpdatedFiles} files ===\n`);
}

// Run immediately if executed directly
if (process.argv[1] && process.argv[1].endsWith('sync_db_to_raw.js')) {
  syncDbToRaw();
}

