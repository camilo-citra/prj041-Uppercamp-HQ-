import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const dbPath = './uppercamp_hq.db';
const rawDir = './Raw';

const db = new Database(dbPath);
const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.md')).sort();

console.log('=== FIXING SYNC DB ACTION ITEM STATUSES TO RAW MARKDOWN FILES ===\n');

let totalUpdatedFiles = 0;
let totalUpdatedRows = 0;

for (const file of files) {
  const fullPath = path.join(rawDir, file);
  let content = fs.readFileSync(fullPath, 'utf8');

  const idMatch = file.match(/Minutes\d+/i);
  const meetingId = idMatch ? idMatch[0] : file.replace(/\.md$/, '');

  const dbRows = db.prepare('SELECT item_num, action_code, assignee, status, description FROM action_items WHERE meeting_id = ? ORDER BY item_num ASC').all(meetingId);

  let fileModified = false;
  let lines = content.split('\n');

  let inActionItemsSection = false;
  let tableHeaderFound = false;
  let currentRowIndex = 0;

  lines = lines.map(line => {
    const trimmed = line.trim();

    if (/^#+\s*.*Action Items/i.test(trimmed)) {
      inActionItemsSection = true;
      tableHeaderFound = false;
      currentRowIndex = 0;
      return line;
    }

    if (inActionItemsSection && trimmed.startsWith('#')) {
      inActionItemsSection = false;
      return line;
    }

    if (inActionItemsSection && trimmed.includes('|')) {
      if (trimmed.toLowerCase().includes('task') || trimmed.toLowerCase().includes('action item') || trimmed.includes(':----')) {
        tableHeaderFound = true;
        return line;
      }

      if (tableHeaderFound) {
        currentRowIndex++;
        const dbItem = dbRows.find(r => r.item_num === currentRowIndex);
        if (dbItem) {
          const parts = line.split('|');
          if (parts.length >= 4) {
            const currentStatusCell = parts[parts.length - 2].trim();
            if (currentStatusCell.toLowerCase() !== dbItem.status.toLowerCase()) {
              parts[parts.length - 2] = ` ${dbItem.status} `;
              line = parts.join('|');
              fileModified = true;
              totalUpdatedRows++;
              console.log(`  [${meetingId}] Item #${dbItem.item_num} (${dbItem.action_code}): "${currentStatusCell}" -> "${dbItem.status}"`);
            }
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
  } else {
    console.log(`ℹ️ No status changes needed for ${file}\n`);
  }
}

console.log('=== SYNC COMPLETE ===');
console.log(`Total files modified: ${totalUpdatedFiles}`);
console.log(`Total action item statuses updated in Markdown: ${totalUpdatedRows}`);
