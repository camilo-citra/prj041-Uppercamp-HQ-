-- Core Databases Schema for prj041 Uppercamp HQ

CREATE TABLE IF NOT EXISTS brief (
  id INTEGER PRIMARY KEY DEFAULT 1,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  core_requirements TEXT NOT NULL,
  last_updated_meeting_id TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meeting_metadata (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  location TEXT,
  pm TEXT,
  attendees TEXT,
  apologies TEXT,
  raw_file_name TEXT NOT NULL,
  gemini_link TEXT,
  executive_summary TEXT,
  raw_markdown TEXT
);

CREATE TABLE IF NOT EXISTS decisions_taken (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_num INTEGER,
  impact_area TEXT NOT NULL DEFAULT 'General',
  summary TEXT NOT NULL,
  meeting_id TEXT NOT NULL,
  FOREIGN KEY (meeting_id) REFERENCES meeting_metadata(id)
);

CREATE TABLE IF NOT EXISTS action_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_num INTEGER,
  description TEXT NOT NULL,
  assignee TEXT DEFAULT 'Unassigned',
  due_date TEXT DEFAULT 'TBD',
  status TEXT DEFAULT 'Pending',
  meeting_id TEXT NOT NULL,
  FOREIGN KEY (meeting_id) REFERENCES meeting_metadata(id)
);

CREATE TABLE IF NOT EXISTS risk_raised (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  contingency_measure TEXT,
  impact_level TEXT NOT NULL DEFAULT 'Medium',
  likelihood TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  meeting_id TEXT NOT NULL,
  FOREIGN KEY (meeting_id) REFERENCES meeting_metadata(id)
);

CREATE TABLE IF NOT EXISTS assumptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  status TEXT DEFAULT 'Active',
  updated_meeting_id TEXT NOT NULL,
  FOREIGN KEY (updated_meeting_id) REFERENCES meeting_metadata(id)
);

CREATE TABLE IF NOT EXISTS vector_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id TEXT NOT NULL,
  date TEXT NOT NULL,
  subject TEXT NOT NULL,
  section_type TEXT NOT NULL,
  content TEXT NOT NULL,
  FOREIGN KEY (meeting_id) REFERENCES meeting_metadata(id)
);
