import { generateProjectAnalysis } from '../services/analysisService.js';

let cachedAnalysis = null;
let lastAnalyzedTimestamp = null;
let isAnalyzing = false;

/**
 * Project Intelligence Analyst Agent
 * Runs thematic & qualitative analysis, updates state, and provides cached data.
 */
export function runProjectAnalysis(triggerSource = 'Manual or Ingestion Pipeline') {
  if (isAnalyzing) {
    console.log(`[ProjectAnalysisAgent] Analysis already running. Trigger queued: ${triggerSource}`);
    return cachedAnalysis;
  }

  isAnalyzing = true;
  const startTime = Date.now();
  console.log(`\n======================================================`);
  console.log(`🧠 [ProjectAnalysisAgent] STARTING CONTINUOUS THEMATIC & QUALITATIVE ANALYSIS`);
  console.log(`📌 Trigger Source: ${triggerSource}`);
  console.log(`⏱️ Timestamp: ${new Date().toISOString()}`);
  console.log(`======================================================`);

  try {
    const analysis = generateProjectAnalysis();
    cachedAnalysis = analysis;
    lastAnalyzedTimestamp = new Date().toISOString();

    const duration = Date.now() - startTime;
    console.log(`✅ [ProjectAnalysisAgent] ANALYSIS COMPLETED IN ${duration}ms`);
    console.log(`   - Meetings Analyzed:       ${analysis.metadata.total_meetings_analyzed}`);
    console.log(`   - Vector Chunks Scanned:   ${analysis.metadata.total_vector_chunks_scanned}`);
    console.log(`   - Top Recurring Themes:    ${analysis.thematicAnalysis.topThemes.length}`);
    console.log(`   - Decisions Aggregated:    ${analysis.metadata.total_decisions_analyzed}`);
    console.log(`   - Risks Mapped (3x3 Grid): ${analysis.metadata.total_risks_analyzed}`);
    console.log(`   - Active Assumptions:      ${analysis.contentMetrics.summary.activeAssumptions}`);
    console.log(`   - Proactive Warnings:      ${analysis.agentIntelligence.proactive_warnings.length}`);
    console.log(`======================================================\n`);

    return analysis;
  } catch (error) {
    console.error('❌ [ProjectAnalysisAgent] ERROR DURING ANALYSIS GENERATION:', error);
    throw error;
  } finally {
    isAnalyzing = false;
  }
}

/**
 * Retrieve the current or fresh analysis results.
 */
export function getLatestProjectAnalysis(forceRefresh = false) {
  if (!cachedAnalysis || forceRefresh) {
    return runProjectAnalysis('On-Demand API Request');
  }
  return cachedAnalysis;
}

// Auto-run if executed directly as standalone script
if (process.argv[1] && process.argv[1].endsWith('projectAnalysisAgent.js')) {
  runProjectAnalysis('CLI Direct Execution');
}
