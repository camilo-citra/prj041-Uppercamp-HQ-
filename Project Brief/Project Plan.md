# Project Plan: Meeting-Driven Project Management App (Localhost Deployment)

This project plan details the technical architecture, execution roadmap, database design, data parsing pipeline, RAG orchestrator, UI dashboards, and local verification strategy for the **prj041 - Uppercamp HQ** meeting management system, derived from `Preliminary Development Plan.md` and `Architecture.md`.

In alignment with workspace rules, execution will adhere to the **`project-team-skills`** framework, dividing responsibilities among six core roles: **Project Manager**, **Systems Architect**, **Database Administrator (DBA)**, **Antigravity Specialist (Full-Stack Developer)**, **UI/UX Designer**, and **QA Engineer**.

---

## Technical Specifications & Localhost Architecture

- **Frontend**: React + Vite (Vanilla CSS design system, dark mode UI, responsive layout).
- **Backend API**: Node.js + Express (serving REST endpoints for meetings, actions, risks, brief, assumptions, RAG search).
- **Database (Relational)**: SQLite database storing structured records across the 6 core databases.
- **Vector Database & RAG**: Vector store for text embeddings of agenda discussions and executive summaries, with metadata filters (`meeting_id`, `date`, `subject`).
- **Data Source**: RAW markdown files located in `Raw/` folder (`prj041 - Uppercamp HQ Design- Minutes00.md` through `Minutes04.md`). No dummy data will be created.

---

## Team Role Responsibilities & Workflow Matrix

| Team Role | Primary Responsibilities in this Plan |
| :--- | :--- |
| **Project Manager** | Milestones tracking, timeline execution, requirements verification against `Preliminary Development Plan.md`. |
| **Systems Architect** | Local runtime environment setup, API architecture, RAG orchestration pipeline, hybrid database setup. |
| **Database Administrator (DBA)** | Relational schema design (6 core databases), vector schema tagging, data integrity & update logic. |
| **Antigravity Specialist** | Full-stack implementation (Express API backend, parsing engine, RAG search route, React UI state). |
| **UI/UX Designer** | Layout design for Meeting View, Action/Risk Dashboards, Project Brief Hub, and RAG AI Chat. |
| **QA Engineer** | Sequential parsing validation on actual raw meeting minutes (`Minutes00` to `Minutes04`), RAG precision tests. |

---

## Proposed Changes & Execution Phases

### Phase 1: Environment, Architecture & Database Design
*Led by Systems Architect & DBA*

#### Target Files:
- `package.json`: Dependencies for backend server (`express`, `better-sqlite3`, `dotenv`, `cors`) and frontend dashboard (`react`, `react-dom`, `vite`, `lucide-react`).
- `src/db/schema.sql`: Relational table definitions for the 6 core databases:
  1. `brief`: Project ID, Title, Objective, Core Requirements, Last Updated Meeting ID.
  2. `meeting_metadata`: ID, Date, Gemini Transcript Link, Attendees, File Path.
  3. `decisions_taken`: ID, Impact Area (Brief, Budget, Process, Specs, Task Allocation), Summary, Meeting ID.
  4. `action_items`: ID, Description, Assignee, Due Date, Status (Pending, In Progress, Completed), Meeting ID.
  5. `risk_raised`: ID, Description, Contingency Measure, Impact Level (Low, Medium, High), Likelihood (Low, Medium, High), Meeting ID.
  6. `assumptions`: ID, Description, Subject/Trade/Category, Status (Active, Adjusted, Invalidated), Updated Meeting ID.
- `src/db/index.js`: Database connection manager initializing SQLite database and preparing table structures.

---

### Phase 2: Chronological Data Ingestion & Parsing Engine
*Led by Antigravity Specialist & QA Engineer*

#### Target Files:
- `src/parser/meetingParser.js`: Markdown parsing engine targeting meeting files from `Raw/`. Extracts metadata, Executive Summary, Agenda Items, Decisions, Action Items, Risks, and Assumptions. Implements chronological sorting based on parsed meeting dates (`Minutes00` -> `Minutes01` -> `Minutes02` -> `Minutes03` -> `Minutes04`).
- `src/services/ingestionService.js`: Ingests parsed sections into SQLite tables. Applies adjustment rules (e.g., updating existing assumptions to 'Adjusted' when subsequent meetings modify them, updating the Brief database based on new project decisions).

---

### Phase 3: Vector Store & RAG Orchestration Pipeline
*Led by Systems Architect & Antigravity Specialist*

#### Target Files:
- `src/rag/vectorStore.js`: Vector indexing module for text chunks (Agenda discussions, Executive Summaries), tagged with `meeting_id`, `date`, `subject`, and `section_type`.
- `src/rag/ragOrchestrator.js`: RAG pipeline retrieving context from vector store + relational tables (SQL structured records). Generates grounded, cited answers for query searches.

---

### Phase 4: Localhost Web Application & UI Dashboards
*Led by UI/UX Designer & Antigravity Specialist*

#### Target Files:
- `server.js`: Express REST API serving endpoints for:
  - `/api/ingest` (Trigger folder parsing and DB updates)
  - `/api/meetings` (Fetch meeting list and detail views)
  - `/api/actions` (Fetch/update action items)
  - `/api/risks` (Fetch risk matrix data)
  - `/api/brief` (Fetch current brief & assumption history)
  - `/api/rag/query` (Execute natural language RAG searches)
- `src/frontend/App.jsx`: Responsive Single-Page Application featuring:
  - **Meeting View Module**: Displaying parsed meeting summaries, raw markdown toggle, and direct Gemini transcript links.
  - **Action Items & Risk Dashboard**: Kanban layout for actions and 3x3 Impact vs Likelihood risk matrix.
  - **Project Brief & Assumptions Tracker**: Living view of project scope and assumption statuses over time.
  - **AI RAG Assistant Chat**: Search interface with citations linking back to original meeting notes.

---

### Phase 5 & 6: Verification, Localhost Launch & Handoff
*Led by QA Engineer & Project Manager*

#### Target Files:
- `scripts/ingest_raw_minutes.js`: CLI script to trigger local ingestion of all 5 existing minute files from `Raw/` directory.

---

## Verification & Testing Plan

### Automated Tests
- Parse validation test: Run `node scripts/ingest_raw_minutes.js` to parse `Minutes00.md` through `Minutes04.md` and verify database population across all 6 tables without errors.
- Schema verification: Check SQL row counts for `meeting_metadata`, `decisions_taken`, `action_items`, `risk_raised`, `assumptions`, and `brief`.

### Manual Verification
1. Launch local dev server: `npm run dev` and navigate to `http://localhost:5173` (or backend `http://localhost:3000`).
2. Verify Meeting View displays all 5 ingested meetings chronologically.
3. Test RAG query tab with queries: *"What decisions were made regarding budget?"* and verify grounded context citation.
4. Verify Risk matrix places risks accurately in Low/Med/High impact & likelihood grid.
