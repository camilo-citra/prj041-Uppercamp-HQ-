import React, { useState, useEffect } from 'react';
import {
  BrainCircuit, Compass, Network, Grid, Sparkles, Activity, Layers, ShieldAlert, CheckCircle2,
  AlertTriangle, UserCheck, RefreshCw, ChevronRight, Copy, Check, Filter, Search, Info, Award, Flag, BookOpen, FileText
} from 'lucide-react';

export default function ProjectIntelligenceHub() {
  const [subTab, setSubTab] = useState('spectrum'); // 'spectrum' | 'graph' | 'retrospective'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data states
  const [intelligenceData, setIntelligenceData] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [retrospectiveData, setRetrospectiveData] = useState(null);

  // Graph filters and interaction
  const [selectedNodeType, setSelectedNodeType] = useState('All');
  const [selectedMeetingFilter, setSelectedMeetingFilter] = useState('All');
  const [selectedGraphNode, setSelectedGraphNode] = useState(null);
  const [graphSearchQuery, setGraphSearchQuery] = useState('');

  // Retrospective filters & UI state
  const [retroCategoryFilter, setRetroCategoryFilter] = useState('All');
  const [copiedReport, setCopiedReport] = useState(false);
  const [showPostMortemModal, setShowPostMortemModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [intelRes, graphRes, retroRes] = await Promise.all([
        fetch('/api/analytics/intelligence'),
        fetch('/api/analytics/decision-graph'),
        fetch('/api/analytics/retrospective')
      ]);

      if (!intelRes.ok || !graphRes.ok || !retroRes.ok) {
        throw new Error('Failed to load analytics from backend server');
      }

      const intelJson = await intelRes.json();
      const graphJson = await graphRes.json();
      const retroJson = await retroRes.json();

      setIntelligenceData(intelJson);
      setGraphData(graphJson.graph);
      setRetrospectiveData(retroJson.retrospective);
    } catch (err) {
      console.error('Error loading intelligence hub data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="section-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '1rem' }}>
        <RefreshCw className="spin" size={32} style={{ color: 'var(--primary-cyan)' }} />
        <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Synthesizing Project Intelligence & Experience Analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertTriangle size={40} style={{ color: '#ef4444', marginBottom: '1rem' }} />
        <h3>Failed to Load Project Intelligence</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error}</p>
        <button className="tab-btn active" onClick={fetchData}>Retry Loading</button>
      </div>
    );
  }

  const { domainSpectrum, actionVelocity, riskTrajectory } = intelligenceData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner Header */}
      <div className="section-card gradient-border" style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(14,24,42,0.9) 0%, rgba(20,35,60,0.9) 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid var(--primary-cyan)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                <BrainCircuit size={26} style={{ color: 'var(--primary-cyan)' }} />
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>Project Intelligence & Experience Hub</h1>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Transforming prj041 Uppercamp HQ meeting records into organizational learnings, domain focus spectrums, causal decision networks, and retrospective insights.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15,23,42,0.8)', padding: '6px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <button
              className={`tab-btn ${subTab === 'spectrum' ? 'active' : ''}`}
              onClick={() => setSubTab('spectrum')}
              style={{ fontSize: '0.85rem' }}
            >
              <Activity size={15} /> Domain & Velocity Analytics
            </button>
            <button
              className={`tab-btn ${subTab === 'graph' ? 'active' : ''}`}
              onClick={() => setSubTab('graph')}
              style={{ fontSize: '0.85rem' }}
            >
              <Network size={15} /> Causal Decision Graph ({graphData?.nodesCount || 0})
            </button>
            <button
              className={`tab-btn ${subTab === 'retrospective' ? 'active' : ''}`}
              onClick={() => setSubTab('retrospective')}
              style={{ fontSize: '0.85rem' }}
            >
              <Compass size={15} /> Retrospective Canvas
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: DOMAIN FOCUS SPECTRUM & VELOCITY ANALYTICS */}
      {subTab === 'spectrum' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Key KPI Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="stat-box">
              <span className="stat-label">Total Meetings Analyzed</span>
              <span className="stat-value">{domainSpectrum.meetingSpectrum.length}</span>
              <span className="stat-sub font-mono">Minutes00 – Minutes05</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Action Completion Velocity</span>
              <span className="stat-value" style={{ color: '#10b981' }}>{actionVelocity.summary.overallCompletionPercentage}%</span>
              <span className="stat-sub">{actionVelocity.summary.completed} of {actionVelocity.summary.totalActions} Done</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Risk Resolution Rate</span>
              <span className="stat-value" style={{ color: '#38bdf8' }}>
                {Math.round((riskTrajectory.closedRisksCount / riskTrajectory.totalRisks) * 100)}%
              </span>
              <span className="stat-sub">{riskTrajectory.closedRisksCount} Closed, {riskTrajectory.openRisksCount} Open</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Primary Project Focus</span>
              <span className="stat-value" style={{ fontSize: '1.3rem', color: '#f59e0b' }}>Civil & Structural</span>
              <span className="stat-sub">Driven by Minutes02 & Minutes05</span>
            </div>
          </div>

          {/* Domain Focus Spectrum Radar & Heatmap */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* SVG Domain Focus Radar Chart */}
            <div className="section-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Layers size={18} style={{ color: 'var(--primary-cyan)' }} /> Domain Focus Spectrum Radar
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Project-wide cognitive bandwidth allocation</span>
                </div>
              </div>

              <SvgDomainRadar overallPercentages={domainSpectrum.overallPercentages} domains={domainSpectrum.domains} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                {domainSpectrum.domains.map(dom => (
                  <div key={dom.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: dom.color }}></div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dom.label}</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{domainSpectrum.overallPercentages[dom.id] || 0}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Domain Focus Spectrum Matrix Heatmap */}
            <div className="section-card" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Grid size={18} style={{ color: '#8b5cf6' }} /> Domain Shift Heatmap Across Meetings
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tracking focus intensity migration per meeting milestone</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {domainSpectrum.domains.map(dom => (
                  <div key={dom.id} style={{ background: 'rgba(15,23,42,0.6)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: dom.color }}>{dom.label}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average: {domainSpectrum.overallPercentages[dom.id]}%</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                      {domainSpectrum.meetingSpectrum.map(ms => {
                        const pct = ms.percentages[dom.id] || 0;
                        const opacity = Math.max(0.15, pct / 40);
                        return (
                          <div
                            key={ms.meeting_id}
                            title={`${ms.meeting_id} (${ms.title}): ${pct}% ${dom.label}`}
                            style={{
                              background: dom.color,
                              opacity: opacity,
                              height: '24px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: pct > 20 ? '#ffffff' : 'rgba(255,255,255,0.7)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {pct}%
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', marginTop: '2px' }}>
                      {domainSpectrum.meetingSpectrum.map(ms => (
                        <div key={ms.meeting_id} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          {ms.meeting_id}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Item Velocity & Stakeholder Capacity Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.5rem' }}>
            {/* Action Item Velocity Burn-down Chart */}
            <div className="section-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity size={18} style={{ color: '#10b981' }} /> Action Generation vs Completion Velocity
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cumulative action items created vs resolved per meeting</p>

              <SvgVelocityChart timelineVelocity={actionVelocity.timelineVelocity} />
            </div>

            {/* Stakeholder Capacity & Workload Risk Matrix */}
            <div className="section-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={18} style={{ color: '#06b6d4' }} /> Stakeholder Capacity & Workload Risk
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assigned action items and risk exposure per team member</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                {actionVelocity.capacityMatrix.map(s => {
                  const riskColor = s.workloadRisk === 'High' ? '#ef4444' : s.workloadRisk === 'Medium' ? '#f59e0b' : '#10b981';
                  return (
                    <div key={s.id} style={{ background: 'rgba(15,23,42,0.6)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{s.name}</span>
                          <span className="pill" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{s.organization}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.role}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{s.actionsAssigned} Actions</div>
                          <div style={{ fontSize: '0.7rem', color: '#10b981' }}>{s.completed} Completed ({s.completionRate}%)</div>
                        </div>

                        <div style={{ width: '80px', textAlign: 'center', padding: '4px 8px', borderRadius: '6px', background: `${riskColor}20`, border: `1px solid ${riskColor}`, color: riskColor, fontSize: '0.75rem', fontWeight: 700 }}>
                          {s.workloadRisk} Load
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CAUSAL DECISION GRAPH NETWORK */}
      {subTab === 'graph' && (
        <div className="section-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Network size={20} style={{ color: 'var(--primary-cyan)' }} /> Causal Decision & Risk Graph Network
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Interactive topology connecting Meetings $\rightarrow$ Decisions $\rightarrow$ Risks $\rightarrow$ Actions $\rightarrow$ Stakeholders
              </p>
            </div>

            {/* Graph Controls Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15,23,42,0.8)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Type:</span>
                <select
                  value={selectedNodeType}
                  onChange={e => setSelectedNodeType(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="All">All Types</option>
                  <option value="meeting">Meetings</option>
                  <option value="decision">Decisions</option>
                  <option value="risk">Risks</option>
                  <option value="action">Actions</option>
                  <option value="stakeholder">Stakeholders</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(15,23,42,0.8)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Meeting:</span>
                <select
                  value={selectedMeetingFilter}
                  onChange={e => setSelectedMeetingFilter(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="All">All Meetings</option>
                  <option value="Minutes00">Minutes00</option>
                  <option value="Minutes01">Minutes01</option>
                  <option value="Minutes02">Minutes02</option>
                  <option value="Minutes03">Minutes03</option>
                  <option value="Minutes04">Minutes04</option>
                  <option value="Minutes05">Minutes05</option>
                </select>
              </div>

              <div className="search-bar" style={{ width: '200px' }}>
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Filter graph nodes..."
                  value={graphSearchQuery}
                  onChange={e => setGraphSearchQuery(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '4px 8px 4px 28px' }}
                />
              </div>
            </div>
          </div>

          {/* Canvas & Legend Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: selectedGraphNode ? '1fr 320px' : '1fr', gap: '1rem', position: 'relative' }}>
            <div style={{ background: '#090d16', borderRadius: '12px', border: '1px solid var(--border-color)', minHeight: '520px', position: 'relative', overflow: 'hidden' }}>
              <SvgInteractiveGraph
                graphData={graphData}
                nodeTypeFilter={selectedNodeType}
                meetingFilter={selectedMeetingFilter}
                searchQuery={graphSearchQuery}
                selectedNode={selectedGraphNode}
                onSelectNode={setSelectedGraphNode}
              />

              {/* Node Legend Overlay */}
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></div> Meeting
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }}></div> Decision
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div> High Risk
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div> Mitigated / Action Done
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }}></div> Stakeholder
                </div>
              </div>
            </div>

            {/* Selected Node Details Panel */}
            {selectedGraphNode && (
              <div style={{ background: 'rgba(15,23,42,0.9)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--primary-cyan)', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '520px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="pill" style={{ background: `${selectedGraphNode.color}25`, color: selectedGraphNode.color, fontWeight: 700 }}>
                    {selectedGraphNode.group}
                  </span>
                  <button className="icon-btn" onClick={() => setSelectedGraphNode(null)} style={{ padding: '2px' }}>✕</button>
                </div>

                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: 'var(--text-main)' }}>{selectedGraphNode.label}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedGraphNode.fullTitle}</span>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', whitespace: 'pre-wrap', lineHeight: 1.5 }}>
                  {selectedGraphNode.details}
                </div>

                <div>
                  <h5 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--primary-cyan)' }}>Connected Links</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {graphData.links
                      .filter(l => l.source === selectedGraphNode.id || l.target === selectedGraphNode.id || l.source?.id === selectedGraphNode.id || l.target?.id === selectedGraphNode.id)
                      .map((l, i) => {
                        const otherId = (l.source === selectedGraphNode.id || l.source?.id === selectedGraphNode.id)
                          ? (l.target?.id || l.target)
                          : (l.source?.id || l.source);
                        const otherNode = graphData.nodes.find(n => n.id === otherId);
                        return (
                          <div key={i} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: l.color }}>{l.label}</span>
                            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{otherNode?.label || otherId}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: RETROSPECTIVE & LESSONS LEARNED CANVAS */}
      {subTab === 'retrospective' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Header Controls & Post-Mortem Export */}
          <div className="section-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Compass size={20} style={{ color: 'var(--primary-cyan)' }} /> Retrospective & Organizational Playbook Canvas
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Structured lessons learned across 4 quadrants to inform future capital projects (prj042+)
              </p>
            </div>

            <button
              className="tab-btn active"
              onClick={() => setShowPostMortemModal(true)}
              style={{ background: 'var(--primary-cyan)', color: '#090d16', fontWeight: 700 }}
            >
              <Sparkles size={16} /> Generate Executive Post-Mortem Report
            </button>
          </div>

          {/* 4 Quadrants Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Quadrant 1: Wins & Effective Trade-offs */}
            <div className="section-card gradient-border" style={{ padding: '1.5rem', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '6px', borderRadius: '8px', color: '#10b981' }}>
                  <Award size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#10b981' }}>Quadrant 1: Wins & Effective Trade-Offs</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Strategies that successfully prevented risk or friction</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {retrospectiveData.quadrants.wins.map((item, idx) => (
                  <div key={idx} style={{ background: 'rgba(15,23,42,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.title}</span>
                      <span className="pill" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.7rem' }}>{item.meeting}</span>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.description}</p>
                    <div style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 8px', borderRadius: '6px', color: '#6ee7b7', fontWeight: 500 }}>
                      <strong>Key Takeaway:</strong> {item.takeaway}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quadrant 2: Unanticipated Friction & Bottlenecks */}
            <div className="section-card gradient-border" style={{ padding: '1.5rem', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '6px', borderRadius: '8px', color: '#ef4444' }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#ef4444' }}>Quadrant 2: Unanticipated Friction Points</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unexpected challenges and execution delays</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {retrospectiveData.quadrants.frictionPoints.map((item, idx) => (
                  <div key={idx} style={{ background: 'rgba(15,23,42,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.title}</span>
                      <span className="pill" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.7rem' }}>{item.meeting}</span>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.description}</p>
                    <div style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', padding: '6px 8px', borderRadius: '6px', color: '#fca5a5', fontWeight: 500 }}>
                      <strong>Key Takeaway:</strong> {item.takeaway}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quadrant 3: Critical Pivot Points */}
            <div className="section-card gradient-border" style={{ padding: '1.5rem', borderColor: 'rgba(139, 92, 246, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '6px', borderRadius: '8px', color: '#8b5cf6' }}>
                  <Flag size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#8b5cf6' }}>Quadrant 3: Critical Pivot Points</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Key decisions that fundamentally altered project direction</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {retrospectiveData.quadrants.pivotPoints.map((item, idx) => (
                  <div key={idx} style={{ background: 'rgba(15,23,42,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.title}</span>
                      <span className="pill" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', fontSize: '0.7rem' }}>{item.meeting}</span>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.description}</p>
                    <div style={{ fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.08)', padding: '6px 8px', borderRadius: '6px', color: '#c4b5fd', fontWeight: 500 }}>
                      <strong>Key Takeaway:</strong> {item.takeaway}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quadrant 4: Reusable Playbook Standards */}
            <div className="section-card gradient-border" style={{ padding: '1.5rem', borderColor: 'rgba(6, 182, 212, 0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '6px', borderRadius: '8px', color: '#06b6d4' }}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#06b6d4' }}>Quadrant 4: Reusable Playbook Standards</h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Institutional standards to embed in prj042+</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {retrospectiveData.quadrants.reusableStandards.map((item, idx) => (
                  <div key={idx} style={{ background: 'rgba(15,23,42,0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{item.title}</span>
                      <span className="pill" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', fontSize: '0.7rem' }}>Standard</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post-Mortem Report Modal */}
      {showPostMortemModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px', width: '90%' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} style={{ color: 'var(--primary-cyan)' }} /> Executive Post-Mortem Report
              </h3>
              <button className="icon-btn" onClick={() => setShowPostMortemModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(15,23,42,0.8)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-main)' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary-cyan)' }}>prj041 - Uppercamp HQ Project Retrospective Summary</h4>
                <p>{retrospectiveData.executivePostMortem}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Formatted for executive presentation & team archives</span>
                <button
                  className="tab-btn active"
                  onClick={() => {
                    navigator.clipboard.writeText(retrospectiveData.executivePostMortem);
                    setCopiedReport(true);
                    setTimeout(() => setCopiedReport(false), 2000);
                  }}
                  style={{ fontSize: '0.8rem' }}
                >
                  {copiedReport ? <Check size={14} /> : <Copy size={14} />} {copiedReport ? 'Copied to Clipboard!' : 'Copy Summary'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * SVG Domain Radar Chart Component
 */
function SvgDomainRadar({ overallPercentages, domains }) {
  const size = 320;
  const center = size / 2;
  const radius = 105;
  const totalAxes = domains.length;

  const points = domains.map((dom, idx) => {
    const angle = (Math.PI * 2 / totalAxes) * idx - (Math.PI / 2);
    const pct = (overallPercentages[dom.id] || 0) / 45; // scale to radius
    const r = radius * Math.min(1, Math.max(0.1, pct));
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 0' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Concentric Grid Circles */}
        {[0.25, 0.5, 0.75, 1].map((scale, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius * scale}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray={scale === 1 ? 'none' : '3 3'}
          />
        ))}

        {/* Radar Axes Lines */}
        {domains.map((dom, idx) => {
          const angle = (Math.PI * 2 / totalAxes) * idx - (Math.PI / 2);
          const x2 = center + radius * Math.cos(angle);
          const y2 = center + radius * Math.sin(angle);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.12)"
            />
          );
        })}

        {/* Domain Data Polygon */}
        <polygon
          points={points}
          fill="rgba(56, 189, 248, 0.25)"
          stroke="var(--primary-cyan)"
          strokeWidth="2.5"
        />

        {/* Domain Axis Labels & Data Dots */}
        {domains.map((dom, idx) => {
          const angle = (Math.PI * 2 / totalAxes) * idx - (Math.PI / 2);
          const pct = (overallPercentages[dom.id] || 0) / 45;
          const r = radius * Math.min(1, Math.max(0.1, pct));
          const cx = center + r * Math.cos(angle);
          const cy = center + r * Math.sin(angle);

          const lx = center + (radius + 24) * Math.cos(angle);
          const ly = center + (radius + 16) * Math.sin(angle);

          return (
            <g key={idx}>
              <circle cx={cx} cy={cy} r="4" fill={dom.color} />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize="10"
                fontWeight="600"
              >
                {dom.label.split(' ')[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * SVG Action Item Velocity Chart
 */
function SvgVelocityChart({ timelineVelocity }) {
  const width = 450;
  const height = 240;
  const padding = 35;

  const maxActions = Math.max(...timelineVelocity.map(t => t.cumulativeTotal), 45);
  const xStep = (width - padding * 2) / (timelineVelocity.length - 1);

  const pointsTotal = timelineVelocity.map((t, i) => {
    const x = padding + i * xStep;
    const y = height - padding - (t.cumulativeTotal / maxActions) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const pointsCompleted = timelineVelocity.map((t, i) => {
    const x = padding + i * xStep;
    const y = height - padding - (t.cumulativeCompleted / maxActions) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Horizontal grid lines */}
        {[0, 0.33, 0.66, 1].map((scale, i) => {
          const y = height - padding - scale * (height - padding * 2);
          const val = Math.round(scale * maxActions);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.06)" />
              <text x={padding - 8} y={y + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9">{val}</text>
            </g>
          );
        })}

        {/* Lines */}
        <polyline points={pointsTotal} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="4 4" />
        <polyline points={pointsCompleted} fill="none" stroke="#10b981" strokeWidth="3" />

        {/* Nodes */}
        {timelineVelocity.map((t, i) => {
          const x = padding + i * xStep;
          const yTot = height - padding - (t.cumulativeTotal / maxActions) * (height - padding * 2);
          const yComp = height - padding - (t.cumulativeCompleted / maxActions) * (height - padding * 2);
          return (
            <g key={i}>
              <circle cx={x} cy={yTot} r="4" fill="#3b82f6" />
              <circle cx={x} cy={yComp} r="5" fill="#10b981" />
              <text x={x} y={height - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{t.meeting_id}</text>
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '2px', background: '#3b82f6', borderTop: '2px dashed #3b82f6' }}></div>
          <span style={{ color: 'var(--text-secondary)' }}>Cumulative Actions Created</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '16px', height: '3px', background: '#10b981' }}></div>
          <span style={{ color: 'var(--text-secondary)' }}>Cumulative Completed</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Interactive SVG Graph Visualizer Component
 */
function SvgInteractiveGraph({ graphData, nodeTypeFilter, meetingFilter, searchQuery, selectedNode, onSelectNode }) {
  if (!graphData || !graphData.nodes) return null;

  const width = 800;
  const height = 520;

  // Filter nodes based on user selections
  const filteredNodes = graphData.nodes.filter(n => {
    if (nodeTypeFilter !== 'All' && n.type !== nodeTypeFilter) return false;
    if (meetingFilter !== 'All' && n.meeting_id && n.meeting_id !== meetingFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.label.toLowerCase().includes(q) || n.fullTitle.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

  // Filter links
  const filteredLinks = graphData.links.filter(l => {
    const sId = l.source?.id || l.source;
    const tId = l.target?.id || l.target;
    return filteredNodeIds.has(sId) && filteredNodeIds.has(tId);
  });

  // Simple Force Layout Simulation Position Generator for SVG
  const nodePositions = {};
  const total = filteredNodes.length;

  filteredNodes.forEach((n, i) => {
    let x, y;
    if (n.type === 'meeting') {
      const idx = ['Minutes00', 'Minutes01', 'Minutes02', 'Minutes03', 'Minutes04', 'Minutes05'].indexOf(n.label);
      x = 100 + (idx >= 0 ? idx : i) * 110;
      y = 120;
    } else if (n.type === 'decision') {
      x = 80 + (i % 7) * 105;
      y = 220 + Math.floor(i / 7) * 60;
    } else if (n.type === 'risk') {
      x = 100 + (i % 6) * 120;
      y = 360;
    } else if (n.type === 'stakeholder') {
      x = 120 + (i % 5) * 140;
      y = 440;
    } else {
      x = 70 + (i % 8) * 90;
      y = 290 + (i % 2) * 50;
    }
    nodePositions[n.id] = { x: Math.min(width - 40, Math.max(40, x)), y: Math.min(height - 40, Math.max(40, y)) };
  });

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: '#090d16', cursor: 'grab' }}>
      {/* Edge Links */}
      {filteredLinks.map((l, idx) => {
        const sId = l.source?.id || l.source;
        const tId = l.target?.id || l.target;
        const posS = nodePositions[sId];
        const posT = nodePositions[tId];
        if (!posS || !posT) return null;

        const isHighlighted = selectedNode && (selectedNode.id === sId || selectedNode.id === tId);

        return (
          <line
            key={idx}
            x1={posS.x}
            y1={posS.y}
            x2={posT.x}
            y2={posT.y}
            stroke={isHighlighted ? 'var(--primary-cyan)' : l.color || 'rgba(255,255,255,0.15)'}
            strokeWidth={isHighlighted ? 2.5 : 1}
            strokeOpacity={isHighlighted ? 1 : 0.4}
          />
        );
      })}

      {/* Graph Nodes */}
      {filteredNodes.map(n => {
        const pos = nodePositions[n.id];
        if (!pos) return null;
        const isSelected = selectedNode && selectedNode.id === n.id;

        return (
          <g
            key={n.id}
            transform={`translate(${pos.x},${pos.y})`}
            onClick={() => onSelectNode(n)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              r={n.size || 16}
              fill={n.color}
              stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.4)'}
              strokeWidth={isSelected ? 3 : 1.5}
              style={{ transition: 'all 0.2s ease' }}
            />
            <text
              y={n.size + 12}
              textAnchor="middle"
              fill={isSelected ? '#ffffff' : 'var(--text-secondary)'}
              fontSize={isSelected ? '10' : '9'}
              fontWeight={isSelected ? '700' : '500'}
            >
              {n.label.slice(0, 16)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
