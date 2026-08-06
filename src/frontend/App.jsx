import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckSquare, AlertTriangle, FileText, Search, RefreshCw, 
  ExternalLink, Layers, MessageSquare, ChevronRight, User, Users, MapPin, Clock, Copy, Check 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('meetings');
  const [meetings, setMeetings] = useState([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [meetingDetail, setMeetingDetail] = useState(null);
  const [actions, setActions] = useState([]);
  const [risks, setRisks] = useState([]);
  const [briefData, setBriefData] = useState(null);
  const [stakeholders, setStakeholders] = useState([]);
  const [stakeholderSearch, setStakeholderSearch] = useState('');
  const [stakeholderOrgFilter, setStakeholderOrgFilter] = useState('All');
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
    fetchStakeholders();
  }, []);

  const fetchStakeholders = async () => {
    try {
      const res = await fetch('/api/stakeholders');
      const data = await res.json();
      setStakeholders(data);
    } catch (err) {
      console.error('Error fetching stakeholders:', err);
    }
  };

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
      await fetchStakeholders();
      if (selectedMeetingId) fetchMeetingDetail(selectedMeetingId);
    } catch (err) {
      console.error('Ingestion error:', err);
    } finally {
      setIngesting(false);
    }
  };

  const handleActionStatusChange = async (actionId, newStatus) => {
    // Instant optimistic update for Kanban state
    setActions(prevActions => 
      prevActions.map(act => act.id === actionId ? { ...act, status: newStatus } : act)
    );

    // Instant optimistic update for Minutes detail view state
    setMeetingDetail(prevDetail => {
      if (!prevDetail || !prevDetail.actions) return prevDetail;
      return {
        ...prevDetail,
        actions: prevDetail.actions.map(act => act.id === actionId ? { ...act, status: newStatus } : act)
      };
    });

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

  const [riskStatusFilter, setRiskStatusFilter] = useState('All');
  const [editingRiskId, setEditingRiskId] = useState(null);
  const [editRiskForm, setEditRiskForm] = useState({
    description: '',
    contingency_measure: '',
    impact_level: 'Medium',
    likelihood: 'Medium',
    status: 'Open'
  });

  const handleStartEditRisk = (risk) => {
    setEditingRiskId(risk.id);
    setEditRiskForm({
      description: risk.description || '',
      contingency_measure: risk.contingency_measure || '',
      impact_level: risk.impact_level || 'Medium',
      likelihood: risk.likelihood || 'Medium',
      status: risk.status || 'Open'
    });
  };

  const handleSaveRisk = async (riskId) => {
    try {
      await fetch(`/api/risks/${riskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editRiskForm)
      });
      setEditingRiskId(null);
      fetchRisks();
    } catch (err) {
      console.error('Risk update failed:', err);
    }
  };

  const [editingActionId, setEditingActionId] = useState(null);
  const [editActionForm, setEditActionForm] = useState({
    description: '',
    assignee: '',
    due_date: '',
    status: 'Pending'
  });
  const [actionSearchTerm, setActionSearchTerm] = useState('');

  const handleStartEditAction = (action) => {
    setEditingActionId(action.id);
    setEditActionForm({
      description: action.description || '',
      assignee: action.assignee || '',
      due_date: action.due_date || '',
      status: action.status || 'Pending'
    });
  };

  const handleSaveAction = async (actionId) => {
    // Instant optimistic update for Kanban state
    setActions(prevActions => 
      prevActions.map(act => act.id === actionId ? { ...act, ...editActionForm } : act)
    );

    // Instant optimistic update for Minutes detail view state
    setMeetingDetail(prevDetail => {
      if (!prevDetail || !prevDetail.actions) return prevDetail;
      return {
        ...prevDetail,
        actions: prevDetail.actions.map(act => act.id === actionId ? { ...act, ...editActionForm } : act)
      };
    });

    try {
      await fetch(`/api/actions/${actionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editActionForm)
      });
      setEditingActionId(null);
      fetchActions();
      if (selectedMeetingId) fetchMeetingDetail(selectedMeetingId);
    } catch (err) {
      console.error('Action update failed:', err);
    }
  };

  const filteredActions = actions.filter(a => {
    if (!actionSearchTerm) return true;
    const term = actionSearchTerm.toLowerCase();
    return a.description.toLowerCase().includes(term) || a.assignee.toLowerCase().includes(term) || a.meeting_id.toLowerCase().includes(term);
  });

  const filteredRisks = risks.filter(r => {
    if (riskStatusFilter === 'All') return true;
    return (r.status || 'Open').toLowerCase() === riskStatusFilter.toLowerCase();
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
            className={`tab-btn ${activeTab === 'risks' ? 'active' : ''}`}
            onClick={() => setActiveTab('risks')}
          >
            <AlertTriangle size={16} /> Risk Matrix
          </button>
          <button 
            className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
            onClick={() => setActiveTab('actions')}
          >
            <CheckSquare size={16} /> Action Items
          </button>
          <button 
            className={`tab-btn ${activeTab === 'brief' ? 'active' : ''}`}
            onClick={() => setActiveTab('brief')}
          >
            <Layers size={16} /> Brief & Assumptions
          </button>
          <button 
            className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            <Users size={16} /> Project Team ({stakeholders.length})
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

                {/* ACTION ITEMS */}
                {meetingDetail.actions && meetingDetail.actions.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontFamily: 'var(--font-heading)', color: '#fbbf24', marginBottom: '0.5rem' }}>
                      Action Items ({meetingDetail.actions.length})
                    </h4>
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

                {/* ASSUMPTION REGISTER */}
                {meetingDetail.assumptions && meetingDetail.assumptions.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontFamily: 'var(--font-heading)', color: '#38bdf8', marginBottom: '0.5rem' }}>
                      Assumption Register ({meetingDetail.assumptions.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {meetingDetail.assumptions.map((asm, i) => (
                        <div key={i} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #38bdf8' }}>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#f3f4f6' }}>
                              {asm.description}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              Impact / Category: <strong style={{ color: '#38bdf8' }}>{asm.category || 'Critical'}</strong>
                            </div>
                          </div>
                          <span className={`badge ${asm.status === 'Invalidated' ? 'badge-pending' : 'badge-completed'}`}>
                            {asm.status || 'Active'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DEPENDENCY REGISTER */}
                {meetingDetail.dependencies && meetingDetail.dependencies.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontFamily: 'var(--font-heading)', color: '#c084fc', marginBottom: '0.5rem' }}>
                      Dependency Register ({meetingDetail.dependencies.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {meetingDetail.dependencies.map((dep, i) => (
                        <div key={i} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #c084fc' }}>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f3f4f6' }}>
                              <span style={{ color: '#c084fc', marginRight: '0.4rem' }}>{dep.dep_code}:</span>
                              {dep.description}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
                              <span>Predecessor: <strong style={{ color: '#fff' }}>{dep.predecessor}</strong></span>
                              <span>Successor: <strong style={{ color: '#fff' }}>{dep.successor}</strong></span>
                            </div>
                          </div>
                          <span className="badge badge-in-progress" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                            {dep.status || 'Active'}
                          </span>
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

        {/* TAB 2: RISK MATRIX & RISK REGISTER */}
        {activeTab === 'risks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>
                    Risk & Roadblock Matrix (3x3 Impact vs Likelihood)
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Categorized risk distribution extracted from meeting notes with active contingency measures.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge badge-in-progress" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
                    Total Risks: {risks.length} ({risks.filter(r => (r.status || 'Open') === 'Open').length} Open, {risks.filter(r => r.status === 'Closed').length} Closed)
                  </span>
                </div>
              </div>

              <div className="matrix-grid">
                <div className="matrix-header">Impact \ Likelihood</div>
                <div className="matrix-header">Low Likelihood</div>
                <div className="matrix-header">Medium Likelihood</div>
                <div className="matrix-header">High Likelihood</div>

                <div className="matrix-header" style={{ color: '#f87171' }}>
                  High Impact
                </div>
                <div className="matrix-cell">
                  <div className="cell-count-badge">Count: {risks.filter(r => r.impact_level === 'High' && r.likelihood === 'Low').length}</div>
                  {risks.filter(r => r.impact_level === 'High' && r.likelihood === 'Low').map((r) => <RiskCard key={r.id} risk={r} onEdit={() => handleStartEditRisk(r)} />)}
                </div>
                <div className="matrix-cell high-risk">
                  <div className="cell-count-badge">Count: {risks.filter(r => r.impact_level === 'High' && r.likelihood === 'Medium').length}</div>
                  {risks.filter(r => r.impact_level === 'High' && r.likelihood === 'Medium').map((r) => <RiskCard key={r.id} risk={r} onEdit={() => handleStartEditRisk(r)} />)}
                </div>
                <div className="matrix-cell high-risk" style={{ background: 'rgba(244, 63, 94, 0.15)' }}>
                  <div className="cell-count-badge">Count: {risks.filter(r => r.impact_level === 'High' && r.likelihood === 'High').length}</div>
                  {risks.filter(r => r.impact_level === 'High' && r.likelihood === 'High').map((r) => <RiskCard key={r.id} risk={r} onEdit={() => handleStartEditRisk(r)} />)}
                </div>

                <div className="matrix-header" style={{ color: '#fbbf24' }}>
                  Medium Impact
                </div>
                <div className="matrix-cell">
                  <div className="cell-count-badge">Count: {risks.filter(r => r.impact_level === 'Medium' && r.likelihood === 'Low').length}</div>
                  {risks.filter(r => r.impact_level === 'Medium' && r.likelihood === 'Low').map((r) => <RiskCard key={r.id} risk={r} onEdit={() => handleStartEditRisk(r)} />)}
                </div>
                <div className="matrix-cell">
                  <div className="cell-count-badge">Count: {risks.filter(r => r.impact_level === 'Medium' && r.likelihood === 'Medium').length}</div>
                  {risks.filter(r => r.impact_level === 'Medium' && r.likelihood === 'Medium').map((r) => <RiskCard key={r.id} risk={r} onEdit={() => handleStartEditRisk(r)} />)}
                </div>
                <div className="matrix-cell high-risk">
                  <div className="cell-count-badge">Count: {risks.filter(r => r.impact_level === 'Medium' && r.likelihood === 'High').length}</div>
                  {risks.filter(r => r.impact_level === 'Medium' && r.likelihood === 'High').map((r) => <RiskCard key={r.id} risk={r} onEdit={() => handleStartEditRisk(r)} />)}
                </div>

                <div className="matrix-header" style={{ color: '#34d399' }}>
                  Low Impact
                </div>
                <div className="matrix-cell">
                  <div className="cell-count-badge">Count: {risks.filter(r => r.impact_level === 'Low' && r.likelihood === 'Low').length}</div>
                  {risks.filter(r => r.impact_level === 'Low' && r.likelihood === 'Low').map((r) => <RiskCard key={r.id} risk={r} onEdit={() => handleStartEditRisk(r)} />)}
                </div>
                <div className="matrix-cell">
                  <div className="cell-count-badge">Count: {risks.filter(r => r.impact_level === 'Low' && r.likelihood === 'Medium').length}</div>
                  {risks.filter(r => r.impact_level === 'Low' && r.likelihood === 'Medium').map((r) => <RiskCard key={r.id} risk={r} onEdit={() => handleStartEditRisk(r)} />)}
                </div>
                <div className="matrix-cell">
                  <div className="cell-count-badge">Count: {risks.filter(r => r.impact_level === 'Low' && r.likelihood === 'High').length}</div>
                  {risks.filter(r => r.impact_level === 'Low' && r.likelihood === 'High').map((r) => <RiskCard key={r.id} risk={r} onEdit={() => handleStartEditRisk(r)} />)}
                </div>
              </div>
            </div>

            {/* SECTION BELOW MATRIX: ALL RISKS COUNTED TO DATE */}
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>
                    All Project Risks Counted to Date ({filteredRisks.length})
                  </h3>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Detailed register showing risk valuation (Impact & Likelihood), contingency mitigations, and editable status.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['All', 'Open', 'Closed'].map((status) => (
                    <button 
                      key={status}
                      className={`tab-btn ${riskStatusFilter === status ? 'active' : ''}`}
                      onClick={() => setRiskStatusFilter(status)}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.88rem' }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredRisks.map((risk) => (
                  <div key={risk.id} style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.2rem' }}>
                    {editingRiskId === risk.id ? (
                      /* EDIT RISK FORM */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary-cyan)', fontSize: '0.95rem' }}>
                          Editing Risk Entry #{risk.id} ({risk.meeting_id})
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Description:</label>
                          <textarea 
                            value={editRiskForm.description}
                            onChange={(e) => setEditRiskForm({...editRiskForm, description: e.target.value})}
                            style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.88rem', marginTop: '0.2rem' }}
                            rows={2}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mitigation / Contingency Measure:</label>
                          <textarea 
                            value={editRiskForm.contingency_measure}
                            onChange={(e) => setEditRiskForm({...editRiskForm, contingency_measure: e.target.value})}
                            style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.88rem', marginTop: '0.2rem' }}
                            rows={2}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <div>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Impact Level:</label>
                            <select 
                              value={editRiskForm.impact_level}
                              onChange={(e) => setEditRiskForm({...editRiskForm, impact_level: e.target.value})}
                              style={{ background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.82rem', marginTop: '0.2rem' }}
                            >
                              <option value="High">High Impact</option>
                              <option value="Medium">Medium Impact</option>
                              <option value="Low">Low Impact</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Likelihood:</label>
                            <select 
                              value={editRiskForm.likelihood}
                              onChange={(e) => setEditRiskForm({...editRiskForm, likelihood: e.target.value})}
                              style={{ background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.82rem', marginTop: '0.2rem' }}
                            >
                              <option value="High">High Likelihood</option>
                              <option value="Medium">Medium Likelihood</option>
                              <option value="Low">Low Likelihood</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Status:</label>
                            <select 
                              value={editRiskForm.status}
                              onChange={(e) => setEditRiskForm({...editRiskForm, status: e.target.value})}
                              style={{ background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.82rem', marginTop: '0.2rem' }}
                            >
                              <option value="Open">Open</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <button onClick={() => handleSaveRisk(risk.id)} className="tab-btn active" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>Save Changes</button>
                          <button onClick={() => setEditingRiskId(null)} className="tab-btn" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      /* READ-ONLY RISK ITEM */
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className="badge badge-in-progress" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: 700 }}>
                              {risk.risk_code || `RSK-${String(risk.id).padStart(3, '0')}`}
                            </span>
                            <span className="badge badge-in-progress">{risk.meeting_id}</span>
                            <span className={`badge ${risk.status === 'Closed' ? 'badge-completed' : 'badge-pending'}`}>
                              {risk.status || 'Open'}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date: {risk.date}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '4px', background: risk.impact_level === 'High' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: risk.impact_level === 'High' ? '#f87171' : '#fbbf24', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                              Impact: {risk.impact_level}
                            </span>
                            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                              Likelihood: {risk.likelihood}
                            </span>
                            <button onClick={() => handleStartEditRisk(risk)} className="tab-btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', marginLeft: '0.5rem' }}>
                              Edit
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#f3f4f6', marginBottom: '0.5rem' }}>
                          {risk.description}
                        </div>

                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'rgba(15, 23, 42, 0.6)', padding: '0.6rem 0.8rem', borderRadius: '8px', borderLeft: '3px solid var(--primary-cyan)' }}>
                          <strong style={{ color: 'var(--primary-cyan)' }}>Mitigation / Next Step:</strong> {risk.contingency_measure}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KANBAN ACTION ITEMS BOARD */}
        {activeTab === 'actions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem' }}>
                    Project Action Items Board ({actions.length})
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Vertical execution structure tracking Pending, In Progress, and Completed task items.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text"
                      placeholder="Search task or assignee..."
                      value={actionSearchTerm}
                      onChange={(e) => setActionSearchTerm(e.target.value)}
                      style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem 0.6rem 0.4rem 2rem', color: '#fff', fontSize: '0.82rem', width: '220px' }}
                    />
                  </div>
                </div>
              </div>

              {/* 3 VERTICAL KANBAN COLUMNS */}
              <div className="kanban-board">
                {/* COLUMN 1: PENDING */}
                <KanbanColumn 
                  title="Pending"
                  color="#fbbf24"
                  badgeClass="badge-pending"
                  items={filteredActions.filter(a => a.status === 'Pending')}
                  editingActionId={editingActionId}
                  editActionForm={editActionForm}
                  setEditActionForm={setEditActionForm}
                  onStartEdit={handleStartEditAction}
                  onSaveEdit={handleSaveAction}
                  onCancelEdit={() => setEditingActionId(null)}
                  onStatusChange={handleActionStatusChange}
                />

                {/* COLUMN 2: IN PROGRESS */}
                <KanbanColumn 
                  title="In Progress"
                  color="#60a5fa"
                  badgeClass="badge-in-progress"
                  items={filteredActions.filter(a => a.status === 'In Progress')}
                  editingActionId={editingActionId}
                  editActionForm={editActionForm}
                  setEditActionForm={setEditActionForm}
                  onStartEdit={handleStartEditAction}
                  onSaveEdit={handleSaveAction}
                  onCancelEdit={() => setEditingActionId(null)}
                  onStatusChange={handleActionStatusChange}
                />

                {/* COLUMN 3: COMPLETED */}
                <KanbanColumn 
                  title="Completed"
                  color="#34d399"
                  badgeClass="badge-completed"
                  items={filteredActions.filter(a => a.status === 'Completed')}
                  editingActionId={editingActionId}
                  editActionForm={editActionForm}
                  setEditActionForm={setEditActionForm}
                  onStartEdit={handleStartEditAction}
                  onSaveEdit={handleSaveAction}
                  onCancelEdit={() => setEditingActionId(null)}
                  onStatusChange={handleActionStatusChange}
                />
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

        {/* TAB 5: PROJECT TEAM & STAKEHOLDERS DIRECTORY */}
        {activeTab === 'team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', color: 'var(--primary-cyan)' }}>
                    Project Team & Stakeholders Directory ({stakeholders.length})
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Comprehensive directory of project stakeholders, design consultants, engineering leads, and HODs.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text"
                      placeholder="Search name, role, or org..."
                      value={stakeholderSearch}
                      onChange={(e) => setStakeholderSearch(e.target.value)}
                      style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem 0.6rem 0.4rem 2rem', color: '#fff', fontSize: '0.82rem', width: '210px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {['All', 'Citra', 'Kim Williams Design', 'Engineering Consultants'].map((org) => (
                      <button
                        key={org}
                        className={`tab-btn ${stakeholderOrgFilter === org ? 'active' : ''}`}
                        onClick={() => setStakeholderOrgFilter(org)}
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                      >
                        {org}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* STAKEHOLDERS GRID */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {stakeholders
                  .filter(s => {
                    const matchSearch = !stakeholderSearch || 
                      s.name.toLowerCase().includes(stakeholderSearch.toLowerCase()) || 
                      s.role.toLowerCase().includes(stakeholderSearch.toLowerCase()) || 
                      s.organization.toLowerCase().includes(stakeholderSearch.toLowerCase());
                    const matchOrg = stakeholderOrgFilter === 'All' || s.organization.toLowerCase().includes(stakeholderOrgFilter.toLowerCase());
                    return matchSearch && matchOrg;
                  })
                  .map((person) => {
                    const initials = person.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                    const orgColor = person.organization.includes('Kim Williams') ? '#c084fc' : 
                                     person.organization.includes('Engineering') ? '#f87171' : 
                                     person.organization.includes('Executive') ? '#fbbf24' : '#38bdf8';

                    return (
                      <div key={person.id} style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                        <div>
                          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center', marginBottom: '0.85rem' }}>
                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: `rgba(${orgColor === '#c084fc' ? '192, 132, 252' : orgColor === '#f87171' ? '248, 113, 113' : orgColor === '#fbbf24' ? '251, 191, 36' : '56, 189, 248'}, 0.2)`, color: orgColor, border: `1px solid ${orgColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.05rem', fontFamily: 'var(--font-heading)' }}>
                              {initials}
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#f3f4f6' }}>{person.name}</h4>
                              <div style={{ fontSize: '0.78rem', color: orgColor, fontWeight: 600 }}>{person.role}</div>
                            </div>
                          </div>

                          <div style={{ marginBottom: '0.75rem' }}>
                            <span className="badge badge-in-progress" style={{ fontSize: '0.72rem', background: 'rgba(30, 41, 59, 0.8)' }}>
                              {person.organization}
                            </span>
                          </div>

                          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45', background: 'rgba(15, 23, 42, 0.5)', padding: '0.65rem 0.8rem', borderRadius: '8px', borderLeft: `3px solid ${orgColor}` }}>
                            <strong style={{ color: '#fff' }}>Responsibilities:</strong> {person.key_responsibilities}
                          </p>
                        </div>

                        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          <span>Meetings Attended: <strong style={{ color: '#fff' }}>{person.meetings_attended} / 5</strong></span>
                          <span>Actions Assigned: <strong style={{ color: person.actions_assigned > 0 ? 'var(--primary-cyan)' : 'var(--text-muted)' }}>{person.actions_assigned}</strong></span>
                        </div>
                      </div>
                    );
                  })}
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

function RiskCard({ risk, onEdit }) {
  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.78rem', borderLeft: '3px solid var(--primary-cyan)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div style={{ fontWeight: 600, color: '#f3f4f6' }}>
          <span style={{ color: '#c084fc', marginRight: '0.4rem', fontWeight: 700 }}>
            {risk.risk_code || `RSK-${String(risk.id).padStart(3, '0')}`}:
          </span>
          {risk.description}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          <span className={`badge ${risk.status === 'Closed' ? 'badge-completed' : 'badge-pending'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
            {risk.status || 'Open'}
          </span>
          {onEdit && (
            <button onClick={onEdit} className="tab-btn" style={{ fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
              Edit
            </button>
          )}
        </div>
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
        <strong>Mitigation:</strong> {risk.contingency_measure}
      </div>
    </div>
  );
}

function KanbanColumn({ 
  title, color, badgeClass, items, 
  editingActionId, editActionForm, setEditActionForm, 
  onStartEdit, onSaveEdit, onCancelEdit, onStatusChange 
}) {
  return (
    <div className={`kanban-column ${title.toLowerCase().replace(' ', '-')}`}>
      <div className="kanban-column-header">
        <div className="kanban-column-title" style={{ color }}>
          <span>{title === 'Pending' ? '⏳' : title === 'In Progress' ? '⚡' : '✅'}</span>
          {title}
        </div>
        <span className={`badge ${badgeClass}`}>{items.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {items.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center', padding: '2rem 0' }}>
            No tasks in {title}
          </div>
        ) : (
          items.map((item) => (
            <div 
              key={item.id} 
              style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
            >
              {editingActionId === item.id ? (
                /* EDIT ACTION ITEM FORM */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-cyan)' }}>
                    Edit Action Item #{item.id} ({item.meeting_id})
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Description:</label>
                    <textarea 
                      value={editActionForm.description}
                      onChange={(e) => setEditActionForm({...editActionForm, description: e.target.value})}
                      style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem', fontSize: '0.82rem', marginTop: '0.2rem' }}
                      rows={2}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assignee:</label>
                    <input 
                      type="text"
                      value={editActionForm.assignee}
                      onChange={(e) => setEditActionForm({...editActionForm, assignee: e.target.value})}
                      style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.82rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Due Date:</label>
                      <input 
                        type="text"
                        value={editActionForm.due_date}
                        onChange={(e) => setEditActionForm({...editActionForm, due_date: e.target.value})}
                        style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.8rem', marginTop: '0.2rem' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Status:</label>
                      <select 
                        value={editActionForm.status}
                        onChange={(e) => setEditActionForm({...editActionForm, status: e.target.value})}
                        style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.3rem 0.4rem', fontSize: '0.8rem', marginTop: '0.2rem' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                    <button onClick={() => onSaveEdit(item.id)} className="tab-btn active" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>Save</button>
                    <button onClick={onCancelEdit} className="tab-btn" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>Cancel</button>
                  </div>
                </div>
              ) : (
                /* READ ONLY ACTION ITEM CARD */
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <span className="badge badge-in-progress" style={{ fontSize: '0.7rem' }}>{item.meeting_id}</span>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                      <select 
                        value={item.status}
                        onChange={(e) => onStatusChange(item.id, e.target.value)}
                        style={{ background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', padding: '0.15rem 0.35rem', borderRadius: '4px', fontSize: '0.72rem' }}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                      <button onClick={() => onStartEdit(item)} className="tab-btn" style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}>
                        Edit
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.88rem', fontWeight: 500, color: '#f3f4f6', lineHeight: '1.4' }}>
                    {item.description}
                  </p>

                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    <span>Assignee: <strong style={{ color: '#fff' }}>{item.assignee}</strong></span>
                    <span>Due: {item.due_date}</span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
