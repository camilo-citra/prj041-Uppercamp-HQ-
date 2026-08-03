
# Preliminary Development Plan: Meeting-Driven Project Management App

## Project Overview

This document outlines the preliminary development phases for a project management application built using the Antigravity framework. The core functionality revolves around ingesting raw meeting minutes, extracting structured data, and managing a Retrieval-Augmented Generation (RAG) system across six primary databases.

## Phase 1: Architecture & Database Design

Objective: Set up the Antigravity environment and design the relational and vector database schemas based on the project brief.

- Task 1.1: Initialize the Antigravity project repository and establish the CI/CD pipeline.
- Task 1.2: Design the schema for the six core databases:

1. Brief: Core project definitions and overarching goals.
2. Meeting Metadata: ID, Date, Gemini Transcript Link, Team Members.
3. Decisions Taken: Decision ID, Impact (Brief, Budget, Process, Specs, Task Allocation), Associated Meeting ID.
4. Action Items: Task ID, Description, Assignee, Due Date, Status, Associated Meeting ID.
5. Risk Raised: Risk ID, Description, Contingency Measure, Impact Level (Low/Med/High), Likelihood (Low/Med/High).
6. Assumptions: Assumption ID, Description, Subject/Trade/Brief Category, Status (Active/Adjusted).    

- Task 1.3: Define data relationships (e.g., linking Agenda Items by subject, updating Assumptions based on new meeting records).


## Phase 2: Data Ingestion & Parsing Engine

Objective: Build the backend logic to process the "RAW folder" meeting minute files and extract the required fields.

- Task 2.1: Develop a file upload and parsing module to read structured text/markdown files.
- Task 2.2: Implement chronological sorting logic based on the meeting metadata dates to ensure sequential processing.
- Task 2.3: Build data extraction scripts to map the parsed file sections (Executive Summary, Agenda, Decisions, Actions, Risks, Assumptions) to the database schemas defined in Phase 1.


## Phase 3: RAG Implementation & Database Management (Weeks 5-6)

Objective: Integrate the LLM/RAG capabilities to make the meeting data searchable and cross reference.

- Task 3.1: Set up the vector database for storing text embeddings of Agenda Items, Discussions, and Executive Summaries.
- Task 3.2: Develop the update logic: Ensure that when a new meeting is processed, it appends to history and adjusts existing records (e.g., updating an assumption's status, or modifying the central Brief database based on a new Decision).
- Task 3.3: Build the RAG retrieval pipeline allowing users to query project history (e.g., "What was the decision on the budget in the first meeting?").

## Phase 4: User Interface & Dashboard Development

Objective: Build the frontend interfaces using Antigravity's UI components to visualize the data.

- Task 4.1: Meeting View: An interface to read individual meeting records, view the linked Gemini transcript, and see extracted action items and decisions.
- Task 4.2: Action & Risk Dashboards: Kanban or list views for pending Action Items and a matrix view for Risks Raised (Impact vs. Likelihood).
- Task 4.3: Project Brief & Assumptions Tracker: A central hub showing the current state of the project brief and grouped assumptions, highlighting any recent changes dictated by recent meetings.

## Phase 5: QA Testing & Refinement

Objective: Ensure data integrity and system stability. (Do not create dummy data, work only with files in RAW)

- Task 5.1: Feed sample "RAW" meeting files into the system to test parsing accuracy and database updating logic.
- Task 5.2: Test the RAG querying for accurate contextual retrieval.
- Task 5.3: Perform UI/UX usability testing and fix identified bugs.


## Phase 6: Launch & Handoff

Objective: Deploy the application in local host, and onboard the project team.

- Task 6.1: Final deployment to the production environment.
- Task 6.2: Create user documentation for uploading meeting notes and querying the database.
