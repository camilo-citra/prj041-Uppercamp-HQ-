// src/services/ollamaService.js
// Local Ollama LLM Service with zero-dependency native fetch & fallback handling

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const TIMEOUT_MS = 15000;

/**
 * Check if local Ollama daemon is active and return available models.
 */
export async function checkOllamaStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const models = (data.models || []).map(m => m.name);
      return {
        available: true,
        host: OLLAMA_HOST,
        models,
        activeModel: models.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : (models[0] || DEFAULT_MODEL)
      };
    }
  } catch (err) {
    // Offline or unreachable
  }

  return {
    available: false,
    host: OLLAMA_HOST,
    models: [],
    activeModel: null,
    message: 'Ollama is currently offline. System is running in high-speed deterministic fallback mode.'
  };
}

/**
 * Generate structured JSON from raw meeting text via Ollama.
 */
export async function extractMeetingWithOllama(rawContent, meetingId = 'Minutes') {
  const status = await checkOllamaStatus();
  if (!status.available) {
    return null;
  }

  const modelToUse = status.activeModel || DEFAULT_MODEL;

  const prompt = `You are an expert construction & engineering project management data parser.
Extract structured entities from the following meeting minutes for project "prj041 - Uppercamp HQ".

IMPORTANT: You MUST respond ONLY with a single valid JSON object. Do not include markdown codeblocks or commentary.
The JSON must follow this EXACT schema:
{
  "title": "Meeting Title",
  "date": "YYYY-MM-DD",
  "time": "HH:MM AM/PM",
  "location": "Meeting location",
  "pm": "Project Manager Name",
  "attendees": "Comma-separated list of attendees",
  "apologies": "Comma-separated list of apologies",
  "executive_summary": "Comprehensive executive summary paragraph",
  "decisions": [
    {
      "num": 1,
      "impact_area": "Budget|Specs|Brief|Process|Task Allocation",
      "summary": "Specific decision text",
      "theme": "Fire Safety|Structural|MEP|Architecture|Governance|General"
    }
  ],
  "action_items": [
    {
      "num": 1,
      "action_code": "ACT-001",
      "description": "Clear actionable task",
      "assignee": "Responsible Person",
      "due_date": "YYYY-MM-DD or TBD",
      "status": "Pending|In Progress|Completed"
    }
  ],
  "risks": [
    {
      "risk_code": "RSK-001",
      "description": "Risk description",
      "contingency_measure": "Mitigation measure",
      "impact_level": "High|Medium|Low",
      "likelihood": "High|Medium|Low",
      "status": "Open|Closed"
    }
  ],
  "assumptions": [
    {
      "asm_code": "ASM-001",
      "description": "Assumption description",
      "category": "Structural|Financial|Design|Fire Safety|General",
      "status": "Active|Adjusted|Invalidated"
    }
  ],
  "dependencies": [
    {
      "dep_code": "DEP-001",
      "description": "Dependency details",
      "predecessor": "Predecessor task or event",
      "successor": "Successor task or event",
      "status": "Active"
    }
  ]
}

Meeting Content:
${rawContent}
`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelToUse,
        prompt,
        format: 'json',
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 2048
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Ollama] Generation failed with HTTP status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const rawResponse = data.response.trim();
    
    // Clean potential markdown backticks if returned
    const cleaned = rawResponse.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsedJson = JSON.parse(cleaned);
    
    return parsedJson;
  } catch (err) {
    console.warn(`[Ollama] Extraction error or timeout:`, err.message);
    return null;
  }
}

/**
 * Synthesize an executive RAG narrative using retrieved SQL records and vector chunks.
 */
export async function synthesizeRAGNarrativeWithOllama(query, sqlContext, vectorChunks) {
  const status = await checkOllamaStatus();
  if (!status.available) {
    return null;
  }

  const modelToUse = status.activeModel || DEFAULT_MODEL;

  const contextFormatted = `
--- STRUCTURED DECISIONS ---
${sqlContext.decisions.map(d => `• [${d.meeting_id} - ${d.date}] Decision ${d.decision_num} (${d.impact_area}): ${d.summary}`).join('\n') || 'None'}

--- ACTION ITEMS ---
${sqlContext.actions.map(a => `• [${a.meeting_id}] ${a.description} (Assignee: ${a.assignee}, Due: ${a.due_date}, Status: ${a.status})`).join('\n') || 'None'}

--- RISKS & MITIGATIONS ---
${sqlContext.risks.map(r => `• [${r.meeting_id}] Risk: ${r.description} | Mitigation: ${r.contingency_measure} (${r.impact_level} Impact)`).join('\n') || 'None'}

--- MEETING DISCUSSION EXCERPTS ---
${vectorChunks.map(c => `• [${c.meeting_id} - ${c.subject} (${c.section_type})]: ${c.content.slice(0, 300)}`).join('\n') || 'None'}
`;

  const prompt = `You are the AI Project Intelligence Officer for "prj041 - Uppercamp HQ" (a high-stakes commercial renovation & development project).
User Question: "${query}"

Below is the verified historical context retrieved from project meetings, decisions, risks, and action registers:
${contextFormatted}

Instructions:
1. Provide a direct, professional, executive-level synthesis answering the user's question clearly.
2. Specifically cite the meeting IDs (e.g. **Minutes00**, **Minutes07**) and dates when referring to events or decisions.
3. If there is a timeline of changes or evolving requirements (e.g. staircase widths, penalty strategies, HVAC placement), clearly explain the evolution and rationale.
4. Keep the response concise, authoritative, and structured with markdown headings and bullet points where helpful.
5. Base your response STRICTLY on the provided context. Do not invent details.
`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelToUse,
        prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 1200
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    return data.response.trim();
  } catch (err) {
    console.warn(`[Ollama] RAG narrative generation error:`, err.message);
    return null;
  }
}
