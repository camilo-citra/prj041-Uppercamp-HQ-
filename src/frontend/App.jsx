import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckSquare, AlertTriangle, FileText, Search, RefreshCw, 
  ExternalLink, Layers, MessageSquare, ChevronRight, User, MapPin, Clock, Copy, Check 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('meetings');
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [meetingDetail, setMeetingDetail] = useState(null);
  const [actions, setActions] = useState([]);
  const [risks, setRisks] = useState([]);
  const [briefData, setBriefData] = useState(null);
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);
  const [actionStatusFilter, setActionStatusFilter] = useState('All');

  // RAG Chat & Consolidated Module state
  const [chatQuery, setChatQuery] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your Uppercamp HQ RAG Intelligence Assistant. Ask me any question, and I will generate a consolidated executive synthesis combining key decisions, action items, risks, and meeting notes.',
      citations: [],
      keyTakeaways: [],
      sourcesCount: 0
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  useEffect(() => {
    fetchMeetings();
    fetchActions();
    fetchRisks();
    fetchBrief();
  }, []);

  const fetchMeetings = async () => {
    try {
      const res = await fetch('/api/meetings');
      const data = await res.json();
      setMeetings(data);
      if (data.length > 0 && !selectedMeetingId) {
        setSelectedMeetingId(data[0].id);
        fetchMeetingDetail(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };

  const fetchMeetingDetail = async (id) => {
    try {
      const res = await fetch(`/api/meetings/${id}`);
      const data = await res.json();
      setMeetingDetail(data);
    } catch (err) {
      console.error('Error fetching meeting detail:', err);
    }
  };

  const fetchActions = async () => {
    try {
      const res = await fetch('/api/actions');
      const data = await res.json();
      setActions(data);
    } catch (err) {
      console.error('Error fetching actions:', err);
    }
  };

  const fetchRisks = async () => {
    try {
      const res = await fetch('/api/risks');
      const data = await res.json();
      setRisks(data);
    } catch (err) {
      console.error('Error fetching risks:', err);
    }
  };

  const fetchBrief = async () => {
    try {
      const res = await fetch('/api/brief');
      const data = await res.json();
      setBriefData(data);
    } catch (err) {
      console.error('Error fetching brief:', err);
    }
  };

  const handleIngest = async () => {
    setIngesting(true);
    try {
      await fetch('/api/ingest', { method: 'POST' });
      await fetchMeetings();
      await fetchActions();
      await fetchRisks();
      await fetchBrief();
      if (selectedMeetingId) fetchMeetingDetail(selectedMeetingId);
    } catch (err) {
      console.error('Ingestion error:', err);
    } finally {
      setIngesting(false);
    }
  };

  const handleActionStatusChange = async (actionId, newStatus) => {
    try {
      await fetch(`/api/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchActions();
      if (selectedMeetingId) fetchMeetingDetail(selectedMeetingId);
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleSendChat = async (presetQuery) => {
    const q = presetQuery || chatQuery;
    if (!q.trim()) return;

    const userMsg = { sender: 'user', text: q };
    setChatMessages(prev => [...prev, userMsg]);
    if (!presetQuery) setChatQuery('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: data.consolidatedSummary,
          keyTakeaways: data.keyTakeaways || [],
          citations: data.citations || [],
          sourcesCount: data.sourcesCount || 0
        }
      ]);
    } catch (err) {
      console.error('RAG query error:', err);
      setChatMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'Error connecting to RAG service. Please try again.' }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(index);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const filteredActions = actions.filter(a => {
    if (actionStatusFilter === 'All') return true;
    return a.status.toLowerCase() === actionStatusFilter.toLowerCase();
  });

  return (
    <div className="app-container">
      {/* Top Header Bar */}
      <header className="header-bar">
        <div className="logo-group">
          <div className="logo-icon">UC</div>
          <div>
            <span className="title-text">prj041 - Uppercamp HQ</span>
            <span className="subtitle-tag">Localhost v1.0</span>
          </div>
        </div>

        <nav className="nav-tabs">
          <button 
            className={`tab-btn ${activeTab === 'meetings' ? 'active' : ''}`}
            onClick={() => setActiveTab('meetings')}
          >
            <Calendar size={16} /> Meeting Minutes
          </button>
          <button 
            className={`tab-btn ${activeTab === 'actions-risks' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions-risks')}
          >
            <CheckSquare size={16} /> Risk Matrix & Actions
          </button>
          <button 
            className={`tab-btn ${activeTab === 'brief' ? 'active' : ''}`}
            onClick={() => setActiveTab('brief')}
          >
            <Layers size={16} /> Brief & Assumptions
          </button>
          <button 
            className={`tab-btn ${activeTab === 'rag' ? 'active' : ''}`}
            onClick={() => setActiveTab('rag')}
          >
            <MessageSquare size={16} /> RAG Intelligence
          </button>
        </nav>

        <button 
          className="tab-btn" 
          onClick={handleIngest} 
          disabled={ingesting}
          style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'var(--border-highlight)' }}
        >
          <RefreshCw size={16} className={ingesting ? 'animate-spin' : ''} />
          {ingesting ? 'Parsing Raw Files...' : 'Re-Sync Minutes'}
        </button>
      </header>

      {/* Main Viewport Content */}
      <main className="main-viewport">
        {/* TAB 1: MEETINGS VIEW */}
        {activeTab === 'meetings' && (
          <div className="meeting-layout">
            <div className="meeting-list">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Chronological Sessions ({meetings.length})
              </h3>
              {meetings.map((m) => (
                <div 
                  key={m.id}
                  className={`meeting-item ${selectedMeetingId === m.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedMeetingId(m.id);
                    fetchMeetingDetail(m.id);
                  }}
                >
                  <div className="meeting-date">{m.date} | {m.id}</div>
                  <div className="meeting-item-title">{m.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                    PM: {m.pm}
                  </div>
                </div>
              ))}
            </div>

            {meetingDetail ? (
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>{meetingDetail.title}</h2>
                    <div style={{ display: 'flex', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={14} color="var(--primary-cyan)" /> {meetingDetail.date} {meetingDetail.time}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <MapPin size={14} color="var(--primary-indigo)" /> {meetingDetail.location}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <User size={14} /> PM: {meetingDetail.pm}
                      </span>
                    </div>
                  </div>
                  {meetingDetail.gemini_link && (
                    <a 
                      href={meetingDetail.gemini_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="tab-btn"
                      style={{ background: 'rgba(129, 140, 248, 0.15)', color: '#a5b4fc' }}
                    >
                      <ExternalLink size={14} /> Gemini Transcript
                    </a>
                  )}
                </div>

                {meetingDetail.attendees && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <strong>Attendees:</strong> {meetingDetail.attendees}
                  </div>
                )}

                {meetingDetail.executive_summary && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary-cyan)', marginBottom: '0.5rem' }}>Executive Summary</h4>
                    <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', background: 'rgba(30, 41, 59, 0.4)', padding: '1rem', borderRadius: '10px', borderLeft: '3px solid var(--primary-cyan)' }}>
                      {meetingDetail.executive_summary}
                    </p>
                  </div>
                )}

                {meetingDetail.decisions && meetingDetail.decisions.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary-purple)', marginBottom: '0.5rem' }}>Decisions Made ({meetingDetail.decisions.length})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {meetingDetail.decisions.map((d, i) => (
                        <div key={i} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <span className="badge badge-in-progress">{d.impact_area}</span>
                          <span style={{ fontSize: '0.9rem' }}>{d.summary}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {meetingDetail.actions && meetingDetail.actions.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontFamily: 'var(--font-heading)', color: '#fbbf24', marginBottom: '0.5rem' }}>Action Items</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {meetingDetail.actions.map((a, i) => (
                        <div key={i} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{a.description}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned to: {a.assignee} | Due: {a.due_date}</div>
                          </div>
                          <select 
                            value={a.status} 
                            onChange={(e) => handleActionStatusChange(a.id, e.target.value)}
                            style={{ background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem' }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: '2rem' }}>
                  <button 
                    onClick={() => setShowRawMarkdown(!showRawMarkdown)} 
                    className="tab-btn" 
                    style={{ fontSize: '0.8rem' }}
                  >
                    <FileText size={14} /> {showRawMarkdown ? 'Hide Raw Markdown' : 'Show Raw Markdown Document'}
                  </button>
                  {showRawMarkdown && (
                    <pre style={{ marginTop: '1rem', background: '#050811', padding: '1rem', borderRadius: '10px', fontSize: '0.8rem', color: '#94a3b8', overflowX: 'auto', maxHeight: '400px' }}>
                      {meetingDetail.raw_markdown}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card">Select a meeting from the list</div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIONS & RISK MATRIX */}
        {activeTab === 'actions-risks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                Risk & Roadblock Matrix (3x3 Impact vs Likelihood)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Categorized risks extracted from meeting notes with active contingency measures.
              </p>

              <div className="matrix-grid">
                <div className="matrix-header">Impact \ Likelihood</div>
                <div className="matrix-header">Low Likelihood</div>
                <div className="matrix-header">Medium Likelihood</div>
                <div className="matrix-header">High Likelihood</div>

                <div className="matrix-header" style={{ color: '#f87171' }}>High Impact</div>
                <div className="matrix-cell">
                  {risks.filter(r => r.impact_level === 'High' && r.likelihood === 'Low').map((r, i) => <RiskCard key={i} risk={r} />)}
                </div>
                <div className="matrix-cell high-risk">
                  {risks.filter(r => r.impact_level === 'High' && r.likelihood === 'Medium').map((r, i) => <RiskCard key={i} risk={r} />)}
                </div>
                <div className="matrix-cell high-risk" style={{ background: 'rgba(244, 63, 94, 0.15)' }}>
                  {risks.filter(r => r.impact_level === 'High' && r.likelihood === 'High').map((r, i) => <RiskCard key={i} risk={r} />)}
                </div>

                <div className="matrix-header" style={{ color: '#fbbf24' }}>Medium Impact</div>
                <div className="matrix-cell">
                  {risks.filter(r => r.impact_level === 'Medium' && r.likelihood === 'Low').map((r, i) => <RiskCard key={i} risk={r} />)}
                </div>
                <div className="matrix-cell">
                  {risks.filter(r => r.impact_level === 'Medium' && r.likelihood === 'Medium').map((r, i) => <RiskCard key={i} risk={r} />)}
                </div>
                <div className="matrix-cell high-risk">
                  {risks.filter(r => r.impact_level === 'Medium' && r.likelihood === 'High').map((r, i) => <RiskCard key={i} risk={r} />)}
                </div>

                <div className="matrix-header" style={{ color: '#34d399' }}>Low Impact</div>
                <div className="matrix-cell">
                  {risks.filter(r => r.impact_level === 'Low' && r.likelihood === 'Low').map((r, i) => <RiskCard key={i} risk={r} />)}
                </div>
                <div className="matrix-cell">
                  {risks.filter(r => r.impact_level === 'Low' && r.likelihood === 'Medium').map((r, i) => <RiskCard key={i} risk={r} />)}
                </div>
                <div className="matrix-cell">
                  {risks.filter(r => r.impact_level === 'Low' && r.likelihood === 'High').map((r, i) => <RiskCard key={i} risk={r} />)}
                </div>
              </div>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem' }}>Project Action Items Tracker ({filteredActions.length})</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['All', 'Pending', 'In Progress', 'Completed'].map((status) => (
                    <button 
                      key={status}
                      className={`tab-btn ${actionStatusFilter === status ? 'active' : ''}`}
                      onClick={() => setActionStatusFilter(status)}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
                {filteredActions.map((item) => (
                  <div key={item.id} style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span className="badge badge-in-progress">{item.meeting_id}</span>
                        <span className={`badge badge-${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span>
                      </div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#f3f4f6' }}>{item.description}</p>
                    </div>
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      <span>Assignee: <strong style={{ color: '#fff' }}>{item.assignee}</strong></span>
                      <span>Due: {item.due_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BRIEF & ASSUMPTIONS */}
        {activeTab === 'brief' && briefData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card">
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--primary-cyan)' }}>
                {briefData.brief.title}
              </h2>
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Project Objective</h4>
                <p style={{ fontSize: '1rem', marginTop: '0.2rem' }}>{briefData.brief.objective}</p>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Core Requirements & Scope</h4>
                <p style={{ fontSize: '0.95rem', marginTop: '0.2rem', color: '#cbd5e1' }}>{briefData.brief.core_requirements}</p>
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: '1rem' }}>
                Project Assumptions Lifecycle Tracker ({briefData.assumptions.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {briefData.assumptions.map((asmp) => (
                  <div key={asmp.id} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span className="badge badge-in-progress">{asmp.category}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Updated: {asmp.updated_meeting_id} ({asmp.meeting_date})</span>
                      </div>
                      <p style={{ fontSize: '0.92rem', color: '#f3f4f6' }}>{asmp.description}</p>
                    </div>
                    <span className={`badge badge-${asmp.status.toLowerCase()}`}>
                      {asmp.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RAG INTELLIGENCE & CONSOLIDATED RESPONSE MODULE */}
        {activeTab === 'rag' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Suggested query topics:</span>
              <button onClick={() => handleSendChat("What decisions were made regarding fire safety and staircase?")} className="tab-btn" style={{ fontSize: '0.8rem' }}>
                🔥 Fire Safety & Staircase
              </button>
              <button onClick={() => handleSendChat("What are the HVAC condenser placement requirements?")} className="tab-btn" style={{ fontSize: '0.8rem' }}>
                ❄️ HVAC & Roof Condensers
              </button>
              <button onClick={() => handleSendChat("Why was the lift replacement excluded from scope?")} className="tab-btn" style={{ fontSize: '0.8rem' }}>
                🛗 Lift Replacement Scope
              </button>
              <button onClick={() => handleSendChat("What software and collaboration platforms are selected?")} className="tab-btn" style={{ fontSize: '0.8rem' }}>
                💻 Revit & ACC Software Protocol
              </button>
            </div>

            <div className="chat-container">
              <div className="chat-history">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-msg ${msg.sender}`} style={{ width: '100%' }}>
                    {msg.sender === 'user' ? (
                      <div style={{ fontWeight: 600 }}>{msg.text}</div>
                    ) : (
                      <div>
                        {/* Executive Consolidated Response Header */}
                        {msg.keyTakeaways && msg.keyTakeaways.length > 0 && (
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                              <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary-cyan)', fontSize: '0.95rem' }}>
                                ⚡ Consolidated Intelligence Takeaways ({msg.sourcesCount} sources retrieved)
                              </h4>
                              <button 
                                onClick={() => copyToClipboard(msg.text, idx)}
                                className="tab-btn" 
                                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.08)' }}
                              >
                                {copiedIdx === idx ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                                {copiedIdx === idx ? 'Copied' : 'Copy Consolidated Report'}
                              </button>
                            </div>
                            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#e2e8f0' }}>
                              {msg.keyTakeaways.map((kt, kti) => (
                                <li key={kti} style={{ marginBottom: '0.25rem' }}>{kt}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Consolidated Response Narrative */}
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.65' }}>{msg.text}</div>

                        {/* Source Citations Explorer */}
                        {msg.citations && msg.citations.length > 0 && (
                          <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.78rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--primary-cyan)', marginBottom: '0.4rem' }}>
                              Traceable Citations & Evidence ({msg.citations.length}):
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {msg.citations.map((c, ci) => (
                                <span key={ci} title={c.text} style={{ background: 'rgba(129, 140, 248, 0.15)', color: '#c7d2fe', padding: '0.2rem 0.55rem', borderRadius: '6px', border: '1px solid rgba(129, 140, 248, 0.3)', cursor: 'pointer' }}>
                                  {c.meeting_id} ({c.section})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-msg ai" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={14} className="animate-spin" /> Synthesizing vector search & relational database context into executive consolidated response...
                  </div>
                )}
              </div>

              <div className="chat-input-row">
                <input 
                  type="text" 
                  className="chat-input"
                  placeholder="Ask any project question to generate a consolidated synthesis..."
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                />
                <button className="send-btn" onClick={() => handleSendChat()}>
                  Generate Consolidated Response
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function RiskCard({ risk }) {
  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.78rem', borderLeft: '2px solid var(--primary-cyan)' }}>
      <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{risk.description}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.2rem' }}>
        <strong>Mitigation:</strong> {risk.contingency_measure}
      </div>
    </div>
  );
}
