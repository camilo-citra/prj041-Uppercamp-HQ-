
```
# Role & Goal
You are an expert full-stack developer specializing in the Antigravity framework, React, and ECharts. Your objective is to expand the existing `DecisionGraph` component inside `src/frontend/App.jsx` into a comprehensive Project Dynamics Map.

# Requirements

## 1. Data Schema Expansion
Ensure the visualization payload synthesizes data from the core SQLite tables (`decisions_taken`, `brief`, `risk_raised`, `meeting_metadata`).
The graph node payload must accept:
- `id`: Opaque string identifier.
- `type`: 'decision' | 'brief_impact' | 'risk_factor'.
- `label`: Concise display title.
- `impact_area`: Metadata tag for clustering (Budget, Specs, Process, Task Allocation, Brief).
- `status`: For risks ('Open' vs 'Closed').

## 2. Dynamic Structural Layout
- Implement an explicit layout grid using your layout parameters (`nodeWidth = 200`, `nodeHeight = 110`, `gapX = 80`, `gapY = 30`).
- Left Column (Level 0): Relational Risk Nodes that triggered conversations.
- Center Column (Level 1): Decision Nodes grouped vertically by their `impact_area` to visualize attention density clusters.
- Right Column (Level 2): Brief Entity Nodes showing permanent scope mutations.

## 3. Visual Line Connections (Edges)
Modify the SVG connection line array generation loop to handle semantic link states:
- If edge type is 'creates_risk', render a dashed red connection line with an end marker arrow.
- If edge type is 'closes_risk', render a solid green connection line with a check-circle indicator.
- If edge type is 'affects_brief', render a blue solid connection line tracking project evolution.

## 4. Retrospective/Future Improvement Panel
Implement a side drawers panel that monitors node counts. If an `impact_area` cluster contains more than 4 decision nodes (e.g., highly volatile areas like 'Budget' or 'Specs'), automatically render a "Retrospective Alert" block inside a Markdown blockquote (`>`) detailing:
- "High-volume structural adjustments detected in [Area Name]."
- A text area providing a prompt context hook to query the `/api/rag/query` endpoint with: "What structural bottlenecks caused repetitive changes in [Area Name] across meeting minutes?"

# Execution
Refactor the rendering logic cleanly, preserving current dark-mode UI token classes and Lucide icon mappings (`AlertTriangle`, `CheckCircle2`, `Layers`, `ShieldAlert`). Do not use LaTeX formatting.
```