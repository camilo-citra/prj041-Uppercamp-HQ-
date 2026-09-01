import React, { useState, useEffect } from 'react';
import {
  BrainCircuit, Sparkles, RefreshCw, AlertTriangle, ShieldAlert, CheckCircle2,
  Calendar, Layers, BarChart3, TrendingUp, Cpu, LayoutGrid, Hammer,
  CircleDollarSign, Users, ChevronRight, FileText, Info, HelpCircle,
  Clock, ArrowUpRight, Search, Filter, Check, Eye
} from 'lucide-react';

export default function AnalysisHub() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [selectedRiskCell, setSelectedRiskCell] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('overview'); // 'overview' | 'themes' | 'metrics'
  const [filterImpactArea, setFilterImpactArea] = useState('All');

  useEffect(() => {
    fetchAnalysis();
  }, []);

  const fetchAnalysis = async (force = false) => {
    try {
      if (force) setRegenerating(true);
      else setLoading(true);

      const endpoint = force ? '/api/analysis/regenerate' : '/api/analysis';
      const options = force ? { method: 'POST' } : { method: 'GET' };

      const res = await fetch(endpoint, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      
      const payload = force && json.analysis ? json.analysis : json;
      setData(payload);
      if (payload?.thematicAnalysis?.topThemes?.length > 0) {
        setSelectedTheme(payload.thematicAnalysis.topThemes[0]);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load project analysis:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="analysis-loading-container">
        <div className="analysis-spinner">
          <BrainCircuit className="spin-icon text-cyan" size={42} />
        </div>
        <h3 className="loading-title">Synthesizing Continuous Project Analysis...</h3>
        <p className="loading-sub">
          Orchestrating Qualitative SQL aggregations and RAG semantic clusters across Minutes00–Minutes07
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="analysis-error-card">
        <AlertTriangle size={36} className="text-warning" />
        <h3>Failed to Load Analysis Hub</h3>
        <p>{error || 'No analysis data received.'}</p>
        <button className="primary-btn" onClick={() => fetchAnalysis(true)}>
          <RefreshCw size={16} /> Retry Analysis Engine
        </button>
      </div>
    );
  }

  const { agentIntelligence, contentMetrics, thematicAnalysis, metadata } = data;
  const topThemes = agentIntelligence?.top_3_recurring_themes || thematicAnalysis?.topThemes || [];
  const budgetVsProcess = agentIntelligence?.statistical_breakdown_budget_vs_process || contentMetrics?.budgetVsProcess || {};
  const proactiveWarnings = agentIntelligence?.proactive_warnings || [];
  const decisionsByImpact = contentMetrics?.decisionsByImpact || [];
  const riskMatrix = contentMetrics?.riskMatrix || { counts: { High: {}, Medium: {}, Low: {} }, grid: { High: {}, Medium: {}, Low: {} } };
  const assumptions = contentMetrics?.assumptions || { byStatus: [], lingeringAssumptions: [] };

  const getThemeIcon = (iconName) => {
    switch (iconName) {
      case 'ShieldAlert': return <ShieldAlert size={18} />;
      case 'CircleDollarSign': return <CircleDollarSign size={18} />;
      case 'LayoutGrid': return <LayoutGrid size={18} />;
      case 'Hammer': return <Hammer size={18} />;
      case 'Cpu': return <Cpu size={18} />;
      case 'Users': return <Users size={18} />;
      default: return <Sparkles size={18} />;
    }
  };

  return (
    <div className="analysis-hub-root">
      {/* Top Header & Action Bar */}
      <div className="analysis-header-banner">
        <div className="analysis-header-info">
          <div className="analysis-badge">
            <BrainCircuit size={16} className="text-cyan pulse" />
            <span>Project Intelligence Analyst Agent</span>
            <span className="live-dot"></span>
          </div>
          <h1 className="analysis-main-title">Continuous Analysis Hub</h1>
          <p className="analysis-main-subtitle">
            Autonomous qualitative SQLite aggregations paired with cross-meeting semantic RAG clusters across 
            <strong> {metadata?.total_meetings_analyzed || 8} ingested minutes</strong>.
          </p>
        </div>

        <div className="analysis-header-actions">
          <div className="timestamp-pill">
            <Clock size={14} />
            <span>Last Analyzed: {metadata?.generated_at ? new Date(metadata.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}</span>
          </div>
          <button 
            className={`btn-regenerate ${regenerating ? 'running' : ''}`}
            onClick={() => fetchAnalysis(true)}
            disabled={regenerating}
            title="Re-run RAG semantic clustering and SQL qualitative aggregations"
          >
            <RefreshCw size={16} className={regenerating ? 'spin-fast' : ''} />
            <span>{regenerating ? 'Analyzing Engine...' : 'Regenerate Analysis'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Bar */}
      <div className="analysis-kpi-grid">
        <div className="kpi-card glass-glow">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Sparkles size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Top Recurring Themes</span>
            <div className="kpi-number-row">
              <span className="kpi-value text-cyan">{topThemes.length}</span>
              <span className="kpi-subtext">Across {metadata?.total_meetings_analyzed} Sessions</span>
            </div>
          </div>
        </div>

        <div className="kpi-card glass-glow">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            <Layers size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Decisions Cataloged</span>
            <div className="kpi-number-row">
              <span className="kpi-value text-purple">{metadata?.total_decisions_analyzed || contentMetrics?.summary?.totalDecisions || 0}</span>
              <span className="kpi-subtext">5 Impact Areas</span>
            </div>
          </div>
        </div>

        <div className="kpi-card glass-glow">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
            <ShieldAlert size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">High-Impact Risks</span>
            <div className="kpi-number-row">
              <span className="kpi-value text-red">
                {(riskMatrix?.counts?.High?.High || 0) + (riskMatrix?.counts?.High?.Medium || 0) + (riskMatrix?.counts?.High?.Low || 0)}
              </span>
              <span className="kpi-subtext">{(contentMetrics?.summary?.openRisks || 0)} Open Total</span>
            </div>
          </div>
        </div>

        <div className="kpi-card glass-glow">
          <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Active Assumptions</span>
            <div className="kpi-number-row">
              <span className="kpi-value text-emerald">{contentMetrics?.summary?.activeAssumptions || 0}</span>
              <span className="kpi-subtext">Pending Validation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proactive Warnings Callout Banner (Prompt Output) */}
      {proactiveWarnings.length > 0 && (
        <div className="proactive-warnings-container">
          <div className="warnings-header">
            <div className="warnings-title-row">
              <AlertTriangle className="text-warning" size={18} />
              <h3>Proactive Warnings & Governance Advisories</h3>
            </div>
            <span className="warnings-badge">{proactiveWarnings.length} Active Insights</span>
          </div>

          <div className="warnings-cards-row">
            {proactiveWarnings.map((w, idx) => (
              <div 
                key={idx} 
                className={`warning-item-card ${
                  w.severity === 'CRITICAL' ? 'severity-critical' : 
                  w.severity === 'WARNING' ? 'severity-warning' : 'severity-info'
                }`}
              >
                <div className="warning-card-head">
                  <span className={`severity-tag ${w.severity.toLowerCase()}`}>{w.severity}</span>
                  <h4 className="warning-title">{w.title}</h4>
                </div>
                <p className="warning-desc">{w.message}</p>

                {w.items && w.items.length > 0 && (
                  <div className="warning-items-list">
                    {w.items.slice(0, 2).map((item, itemIdx) => (
                      <div key={itemIdx} className="warning-subitem">
                        <div className="subitem-bullet"></div>
                        <div className="subitem-text">
                          <strong>{item.code ? `[${item.code}] ` : ''}{item.title || item.description}</strong>
                          {item.meeting_ref && <span className="item-ref-pill">{item.meeting_ref}</span>}
                          {item.contingency && <div className="contingency-note">↳ Mitigation: {item.contingency}</div>}
                        </div>
                      </div>
                    ))}
                    {w.items.length > 2 && (
                      <div className="warning-more-count">
                        + {w.items.length - 2} more items logged in audit matrix
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="analysis-two-column-layout">
        {/* ========================================================= */}
        {/* LEFT COLUMN: THEMATIC TRENDS (Unstructured AI & RAG Insights) */}
        {/* ========================================================= */}
        <div className="analysis-column thematic-column">
          <div className="column-card-header">
            <div className="column-title-group">
              <div className="col-icon-box bg-cyan-glass">
                <Sparkles size={20} className="text-cyan" />
              </div>
              <div>
                <h2 className="column-title">Thematic Trends</h2>
                <p className="column-subtitle">Unstructured RAG semantic clusters across meeting discussions</p>
              </div>
            </div>
            <span className="col-counter-pill">{topThemes.length} Key Themes</span>
          </div>

          {/* Top Recurring Project Themes (Prompt Requirement 1) */}
          <div className="thematic-themes-section">
            <h3 className="section-mini-heading">
              <span>Top Recurring Project Themes</span>
              <span className="heading-sub">Citing verified meeting records & dates</span>
            </h3>

            <div className="theme-cards-stack">
              {topThemes.map((theme, idx) => {
                const isSelected = selectedTheme?.theme_id === theme.theme_id;
                return (
                  <div 
                    key={theme.theme_id || idx} 
                    className={`thematic-theme-card ${isSelected ? 'theme-active' : ''}`}
                    onClick={() => setSelectedTheme(theme)}
                    style={{ borderLeftColor: theme.accentColor || '#38bdf8' }}
                  >
                    <div className="theme-card-top">
                      <div className="theme-rank-badge" style={{ borderColor: theme.accentColor || '#38bdf8', color: theme.accentColor || '#38bdf8' }}>
                        #{theme.rank || idx + 1}
                      </div>
                      <div className="theme-header-text">
                        <div className="theme-category-tag">{theme.category}</div>
                        <h4 className="theme-title">{theme.theme_title}</h4>
                      </div>
                      <div className="theme-recurrence-pill">
                        <span className="rec-count">{theme.recurrence_count}</span>
                        <span className="rec-label">meetings</span>
                      </div>
                    </div>

                    <p className="theme-narrative">{theme.narrative}</p>

                    {/* Cited Meeting Dates Badges */}
                    <div className="theme-citations-row">
                      <span className="citations-label">Cited Meetings:</span>
                      <div className="citation-badges-wrap">
                        {(theme.cited_meeting_dates || []).map((dateStr, cIdx) => (
                          <span key={cIdx} className="citation-badge">
                            <Calendar size={11} />
                            <span>{dateStr}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Expanded Evidence & Context */}
                    {isSelected && (
                      <div className="theme-expanded-drawer">
                        {theme.key_evidence && theme.key_evidence.length > 0 && (
                          <div className="theme-evidence-block">
                            <span className="evidence-header-label">
                              <FileText size={12} /> Discussion Excerpts & Agenda Overlaps:
                            </span>
                            <div className="evidence-items-list">
                              {theme.key_evidence.map((ev, evIdx) => (
                                <div key={evIdx} className="evidence-quote-item">
                                  <div className="quote-meta">
                                    <span className="quote-meeting-id">{ev.meeting_id}</span>
                                    <span className="quote-subject">{ev.subject}</span>
                                  </div>
                                  <div className="quote-body">"{ev.excerpt}"</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {theme.associated_decisions && theme.associated_decisions.length > 0 && (
                          <div className="theme-decisions-block">
                            <span className="evidence-header-label">
                              <CheckCircle2 size={12} className="text-emerald" /> Linked Decisions Taken:
                            </span>
                            <div className="linked-decisions-list">
                              {theme.associated_decisions.map((dec, dIdx) => (
                                <div key={dIdx} className="linked-decision-row">
                                  <span className="dec-num-pill">D{dec.decision_num}</span>
                                  <span className="dec-text">{dec.summary}</span>
                                  <span className="dec-meeting-tag">{dec.meeting_id}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* All Semantic Clusters Explorer */}
          {thematicAnalysis?.allClusters && thematicAnalysis.allClusters.length > 3 && (
            <div className="semantic-clusters-explorer">
              <h3 className="section-mini-heading">
                <span>Secondary Semantic Clusters</span>
                <span className="heading-sub">Cross-meeting discussion linkages</span>
              </h3>
              <div className="secondary-clusters-grid">
                {thematicAnalysis.allClusters.slice(3).map((cl, idx) => (
                  <div key={cl.id || idx} className="secondary-cluster-card">
                    <div className="cluster-head">
                      <div className="cluster-icon-tag" style={{ color: cl.accentColor }}>
                        {getThemeIcon(cl.icon)}
                      </div>
                      <div>
                        <span className="cluster-cat">{cl.category}</span>
                        <h5 className="cluster-name">{cl.title}</h5>
                      </div>
                    </div>
                    <div className="cluster-meta-row">
                      <span>{cl.meetingSpanCount} Sessions</span>
                      <span>•</span>
                      <span>{cl.totalEvidenceCount} Evidence Points</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: CONTENT METRICS (Structured Data Aggregations) */}
        {/* ========================================================= */}
        <div className="analysis-column metrics-column">
          <div className="column-card-header">
            <div className="column-title-group">
              <div className="col-icon-box bg-purple-glass">
                <BarChart3 size={20} className="text-purple" />
              </div>
              <div>
                <h2 className="column-title">Content Metrics</h2>
                <p className="column-subtitle">Structured SQLite aggregations & statistical distributions</p>
              </div>
            </div>
            <span className="col-counter-pill bg-purple-pill">SQL Aggregated</span>
          </div>

          {/* Statistical Breakdown: Budget vs. Process (Prompt Requirement 2) */}
          <div className="metric-box-card">
            <div className="metric-box-header">
              <div className="metric-box-title-row">
                <CircleDollarSign size={18} className="text-purple" />
                <h3>Decision Impact: Budget vs. Process</h3>
              </div>
              <span className="ratio-pill">
                Ratio: <strong>{budgetVsProcess.budget_to_process_ratio || '1.00'} : 1</strong>
              </span>
            </div>

            <p className="stat-commentary">
              {budgetVsProcess.analysis_narrative || budgetVsProcess.comparative_summary || 
                'Comparison of financial value engineering vs operational workflows.'}
            </p>

            {/* Split Comparison Visual Bar */}
            <div className="comparison-visual-container">
              <div className="visual-bar-track">
                <div 
                  className="visual-bar-segment segment-budget" 
                  style={{ width: `${budgetVsProcess.budget_decisions_percentage || budgetVsProcess.budget_percentage || 50}%` }}
                >
                  <span className="segment-label">
                    Budget ({budgetVsProcess.budget_decisions_percentage || budgetVsProcess.budget_percentage || 0}%)
                  </span>
                </div>
                <div 
                  className="visual-bar-segment segment-process" 
                  style={{ width: `${budgetVsProcess.process_decisions_percentage || budgetVsProcess.process_percentage || 50}%` }}
                >
                  <span className="segment-label">
                    Process ({budgetVsProcess.process_decisions_percentage || budgetVsProcess.process_percentage || 0}%)
                  </span>
                </div>
              </div>

              <div className="comparison-numbers-grid">
                <div className="comp-num-cell">
                  <div className="comp-badge-dot bg-purple"></div>
                  <div>
                    <span className="comp-title">Budget Decisions</span>
                    <div className="comp-val">
                      {budgetVsProcess.budget_decisions_count || budgetVsProcess.budget_count || 0}
                      <span className="comp-pct">({budgetVsProcess.budget_decisions_percentage || budgetVsProcess.budget_percentage || 0}%)</span>
                    </div>
                  </div>
                </div>

                <div className="comp-num-cell">
                  <div className="comp-badge-dot bg-cyan"></div>
                  <div>
                    <span className="comp-title">Process Decisions</span>
                    <div className="comp-val">
                      {budgetVsProcess.process_decisions_count || budgetVsProcess.process_count || 0}
                      <span className="comp-pct">({budgetVsProcess.process_decisions_percentage || budgetVsProcess.process_percentage || 0}%)</span>
                    </div>
                  </div>
                </div>

                <div className="comp-num-cell">
                  <div className="comp-badge-dot bg-emerald"></div>
                  <div>
                    <span className="comp-title">Specs / Other</span>
                    <div className="comp-val">
                      {budgetVsProcess.specs_decisions_count || 0}
                      <span className="comp-pct">
                        ({100 - ((budgetVsProcess.budget_decisions_percentage || budgetVsProcess.budget_percentage || 0) + (budgetVsProcess.process_decisions_percentage || budgetVsProcess.process_percentage || 0))}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decisions by Impact Area Full Distribution */}
          <div className="metric-box-card">
            <div className="metric-box-header">
              <div className="metric-box-title-row">
                <Layers size={18} className="text-cyan" />
                <h3>Decisions by Impact Area</h3>
              </div>
              <span className="counter-tag">{contentMetrics?.summary?.totalDecisions || 0} Decisions</span>
            </div>

            <div className="impact-areas-list">
              {decisionsByImpact.map((item, idx) => {
                const getAreaColor = (area) => {
                  switch (area.toLowerCase()) {
                    case 'budget': return '#8b5cf6';
                    case 'process': return '#38bdf8';
                    case 'specs': return '#10b981';
                    case 'brief': return '#f59e0b';
                    case 'task allocation': return '#ec4899';
                    default: return '#94a3b8';
                  }
                };
                const color = getAreaColor(item.impact_area);

                return (
                  <div key={idx} className="impact-area-row">
                    <div className="impact-area-labels">
                      <div className="impact-name-group">
                        <span className="impact-dot" style={{ background: color }}></span>
                        <span className="impact-name">{item.impact_area}</span>
                      </div>
                      <div className="impact-numbers">
                        <span className="impact-count">{item.count} decisions</span>
                        <span className="impact-pct">{item.percentage}%</span>
                      </div>
                    </div>
                    <div className="impact-progress-bar">
                      <div 
                        className="impact-progress-fill" 
                        style={{ width: `${Math.max(item.percentage, 4)}%`, background: color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3x3 Risk Heatmap Matrix (Impact x Likelihood) */}
          <div className="metric-box-card">
            <div className="metric-box-header">
              <div className="metric-box-title-row">
                <ShieldAlert size={18} className="text-red" />
                <h3>Risk Raised Grid (3x3 Matrix)</h3>
              </div>
              <span className="counter-tag bg-red-tag">{contentMetrics?.summary?.totalRisks || 0} Risks Mapped</span>
            </div>

            <div className="risk-matrix-table-wrap">
              <div className="risk-matrix-grid-3x3">
                <div className="matrix-corner-cell">Impact \ Likelihood</div>
                <div className="matrix-col-header">High</div>
                <div className="matrix-col-header">Medium</div>
                <div className="matrix-col-header">Low</div>

                {/* HIGH IMPACT ROW */}
                <div className="matrix-row-header text-red">High</div>
                <div 
                  className={`matrix-cell cell-high-high ${riskMatrix?.counts?.High?.High > 0 ? 'has-items' : ''}`}
                  onClick={() => setSelectedRiskCell({ impact: 'High', likelihood: 'High', list: riskMatrix?.grid?.High?.High || [] })}
                >
                  <span className="cell-count">{riskMatrix?.counts?.High?.High || 0}</span>
                  <span className="cell-severity-label">Critical</span>
                </div>
                <div 
                  className={`matrix-cell cell-high-med ${riskMatrix?.counts?.High?.Medium > 0 ? 'has-items' : ''}`}
                  onClick={() => setSelectedRiskCell({ impact: 'High', likelihood: 'Medium', list: riskMatrix?.grid?.High?.Medium || [] })}
                >
                  <span className="cell-count">{riskMatrix?.counts?.High?.Medium || 0}</span>
                  <span className="cell-severity-label">High</span>
                </div>
                <div 
                  className={`matrix-cell cell-high-low ${riskMatrix?.counts?.High?.Low > 0 ? 'has-items' : ''}`}
                  onClick={() => setSelectedRiskCell({ impact: 'High', likelihood: 'Low', list: riskMatrix?.grid?.High?.Low || [] })}
                >
                  <span className="cell-count">{riskMatrix?.counts?.High?.Low || 0}</span>
                  <span className="cell-severity-label">Moderate</span>
                </div>

                {/* MEDIUM IMPACT ROW */}
                <div className="matrix-row-header text-warning">Medium</div>
                <div 
                  className={`matrix-cell cell-med-high ${riskMatrix?.counts?.Medium?.High > 0 ? 'has-items' : ''}`}
                  onClick={() => setSelectedRiskCell({ impact: 'Medium', likelihood: 'High', list: riskMatrix?.grid?.Medium?.High || [] })}
                >
                  <span className="cell-count">{riskMatrix?.counts?.Medium?.High || 0}</span>
                  <span className="cell-severity-label">High</span>
                </div>
                <div 
                  className={`matrix-cell cell-med-med ${riskMatrix?.counts?.Medium?.Medium > 0 ? 'has-items' : ''}`}
                  onClick={() => setSelectedRiskCell({ impact: 'Medium', likelihood: 'Medium', list: riskMatrix?.grid?.Medium?.Medium || [] })}
                >
                  <span className="cell-count">{riskMatrix?.counts?.Medium?.Medium || 0}</span>
                  <span className="cell-severity-label">Medium</span>
                </div>
                <div 
                  className={`matrix-cell cell-med-low ${riskMatrix?.counts?.Medium?.Low > 0 ? 'has-items' : ''}`}
                  onClick={() => setSelectedRiskCell({ impact: 'Medium', likelihood: 'Low', list: riskMatrix?.grid?.Medium?.Low || [] })}
                >
                  <span className="cell-count">{riskMatrix?.counts?.Medium?.Low || 0}</span>
                  <span className="cell-severity-label">Low</span>
                </div>

                {/* LOW IMPACT ROW */}
                <div className="matrix-row-header text-emerald">Low</div>
                <div 
                  className={`matrix-cell cell-low-high ${riskMatrix?.counts?.Low?.High > 0 ? 'has-items' : ''}`}
                  onClick={() => setSelectedRiskCell({ impact: 'Low', likelihood: 'High', list: riskMatrix?.grid?.Low?.High || [] })}
                >
                  <span className="cell-count">{riskMatrix?.counts?.Low?.High || 0}</span>
                  <span className="cell-severity-label">Moderate</span>
                </div>
                <div 
                  className={`matrix-cell cell-low-med ${riskMatrix?.counts?.Low?.Medium > 0 ? 'has-items' : ''}`}
                  onClick={() => setSelectedRiskCell({ impact: 'Low', likelihood: 'Medium', list: riskMatrix?.grid?.Low?.Medium || [] })}
                >
                  <span className="cell-count">{riskMatrix?.counts?.Low?.Medium || 0}</span>
                  <span className="cell-severity-label">Low</span>
                </div>
                <div 
                  className={`matrix-cell cell-low-low ${riskMatrix?.counts?.Low?.Low > 0 ? 'has-items' : ''}`}
                  onClick={() => setSelectedRiskCell({ impact: 'Low', likelihood: 'Low', list: riskMatrix?.grid?.Low?.Low || [] })}
                >
                  <span className="cell-count">{riskMatrix?.counts?.Low?.Low || 0}</span>
                  <span className="cell-severity-label">Minimal</span>
                </div>
              </div>
            </div>

            {/* Selected Risk Cell Drawer / Popup */}
            {selectedRiskCell && (
              <div className="risk-cell-details-popup">
                <div className="popup-head">
                  <div className="popup-title">
                    <span>Risks with <strong>{selectedRiskCell.impact} Impact</strong> & <strong>{selectedRiskCell.likelihood} Likelihood</strong></span>
                  </div>
                  <button className="popup-close-btn" onClick={() => setSelectedRiskCell(null)}>×</button>
                </div>
                {selectedRiskCell.list.length === 0 ? (
                  <div className="empty-cell-note">No risks logged in this severity quadrant.</div>
                ) : (
                  <div className="popup-risks-list">
                    {selectedRiskCell.list.map((r, rIdx) => (
                      <div key={rIdx} className="popup-risk-card">
                        <div className="r-card-header">
                          <span className="r-code">{r.risk_code || `RSK-${r.id}`}</span>
                          <span className="r-meeting">{r.meeting_id} ({r.date})</span>
                        </div>
                        <div className="r-desc">{r.description}</div>
                        {r.contingency_measure && (
                          <div className="r-mitigation">
                            <strong>Mitigation:</strong> {r.contingency_measure}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Assumptions Status & Stability Distribution */}
          <div className="metric-box-card">
            <div className="metric-box-header">
              <div className="metric-box-title-row">
                <CheckCircle2 size={18} className="text-emerald" />
                <h3>Assumptions Health & Status</h3>
              </div>
              <span className="counter-tag bg-emerald-tag">{contentMetrics?.summary?.totalAssumptions || 0} Tracked</span>
            </div>

            <div className="assumptions-status-grid">
              {(assumptions?.byStatus || []).map((st, idx) => {
                const isActive = st.status.toLowerCase() === 'active';
                const isAdjusted = st.status.toLowerCase() === 'adjusted';
                return (
                  <div key={idx} className={`assumption-status-card ${isActive ? 'status-active-card' : isAdjusted ? 'status-adj-card' : ''}`}>
                    <div className="ass-status-header">
                      <span className={`ass-status-badge ${st.status.toLowerCase()}`}>{st.status}</span>
                      <span className="ass-status-count">{st.count}</span>
                    </div>
                    <div className="ass-status-pct-bar">
                      <div 
                        className={`ass-fill ${st.status.toLowerCase()}`}
                        style={{ width: `${st.percentage}%` }}
                      ></div>
                    </div>
                    <div className="ass-status-pct-label">{st.percentage}% of assumptions</div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
