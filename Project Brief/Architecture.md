
# System Architecture: Meeting-Driven Project Management App

## 1. Architectural Overview

The application follows a modern, modular client-server architecture built on the Antigravity framework. It is designed to handle document ingestion, structured data extraction, relational data management, and AI-driven semantic search (Retrieval-Augmented Generation - RAG).

The system is divided into three primary layers:

1. Presentation Layer (Frontend): Antigravity-based UI for dashboards, meeting views, and RAG querying.
2. Application Layer (Backend): Antigravity server handling file parsing, business logic, API routing, and the RAG orchestration pipeline.
3. Data Layer: A dual-database strategy employing a Relational Database for structured tracking and a Vector Database for semantic search, alongside raw file storage.

## 2. Component Breakdown

### 2.1 Presentation Layer (Frontend)

Built using Antigravity's UI components, this layer serves as the user interaction point.

- Meeting View Module: Interface for rendering ingested meeting summaries, linking to Gemini transcripts, and displaying extracted data.
- Action & Risk Dashboards: Interactive views (e.g., Kanban boards for Actions, Impact/Likelihood matrices for Risks).
- Project Central Hub: Visualizes the current state of the Brief and Assumptions, highlighting historical changes.
- AI Chat/Query Interface: The front-end interface for users to submit natural language queries to the RAG system.

### 2.2 Application Layer (Backend)

This is the core engine of the application, utilizing the Antigravity framework for server-side operations.

- Ingestion & Parsing Engine:
- Monitors or receives uploads to the "RAW folder".
- Sorts files chronologically based on meeting metadata.
- Extracts specific sections (Metadata, Summary, Agenda, Decisions, Actions, Risks, Assumptions) from the raw text/markdown files

- Business Logic Controller:
- Routes parsed data to the appropriate relational databases.
- Manages the "Adjustment Logic" (e.g., updating an Assumption's status from 'Active' to 'Adjusted' based on a new meeting's Decisions).

- RAG Orchestrator:

- Sends raw textual data (Executive Summaries, Agenda discussions) to an Embedding Model (e.g., OpenAI, Gemini, or HuggingFace).
- Manages user queries by converting them to embeddings, retrieving context from the Vector DB, and sending the context + query to the LLM for a formulated response.

### 2.3 Data Layer

A hybrid data storage approach ensures both structured tracking and unstructured search capabilities.

- Relational Database (SQL/PostgreSQL): Stores structured entities defined in the brief.
- Brief (Core project definitions)
- Meeting Metadata (Dates, Links, Team)
- Decisions Taken (Impacts, Links to Brief/Process)
- Action Items (Assignees, Due dates, Status)
- Risk Raised (Impact, Likelihood, Contingencies)
- Assumptions (Subject, Status)
- Vector Database (e.g., Pinecone, Milvus, or pgvector):
	- Stores vector embeddings of unstructured meeting text (Discussions, Summaries) with metadata tags (Meeting ID, Date) to allow for semantic similarity searches.
- File Storage:
- Secure storage for the original "RAW" meeting minute files and transcript links.

## 3. Data Flow & Processing Pipeline

### Phase 1: Ingestion & Extraction

1. A new meeting summary file is added to the "RAW folder".
2. The Parsing Engine reads the file and extracts structured blocks.
3. The Business Logic Controller updates the Relational Database (e.g., inserting new Actions, updating the Brief based on new Decisions).

### Phase 2: Embedding & Indexing (RAG Prep)

1. The descriptive text blocks (Agenda discussions, Executive Summary) are sent to the Embedding Model.
2. The resulting vectors are stored in the Vector Database, tagged with the Meeting ID.

### Phase 3: User Querying (RAG Execution)

1. User asks a question via the Frontend (e.g., "Why did we change the budget in March?").
2. The system converts the query into a vector.
3. The Vector Database returns the most relevant historical meeting discussions.
4. The Relational Database returns any hard-linked Decisions or Actions related to the retrieved meetings.
5. The LLM synthesizes the retrieved unstructured and structured data into a coherent answer for the user.
