import React, { useState, useEffect } from 'react';
import {
  Calendar, CheckSquare, AlertTriangle, FileText, Search, RefreshCw,
  ExternalLink, Layers, MessageSquare, ChevronRight, User, Users, MapPin, Clock, Copy, Check,
  Upload, FilePlus, CheckCircle, CheckCircle2, X, Trash2, Edit2, Plus, Save, UserPlus, ShieldAlert, Network, Grid,
  GitCommit, Sparkles, Link2, Compass, BrainCircuit
} from 'lucide-react';
import ProjectIntelligenceHub from './ProjectIntelligenceHub.jsx';
import AnalysisHub from './AnalysisHub.jsx';

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

  // Decision Intelligence & Timeline state
  const [decisions, setDecisions] = useState([]);
  const [decisionsNarrative, setDecisionsNarrative] = useState(null);
  const [selectedThemeFilter, setSelectedThemeFilter] = useState('All');
  const [selectedDecisionForEdit, setSelectedDecisionForEdit] = useState(null);
  const [editDecisionForm, setEditDecisionForm] = useState({
    impact_area: '',
    summary: '',
    theme: 'General',
    rationale: ''
  });
  const [savingDecision, setSavingDecision] = useState(false);
  const [analyzingDecisions, setAnalyzingDecisions] = useState(false);
  const [selectedCorrelationId, setSelectedCorrelationId] = useState(null);

  // Upload Meeting Summary to RAW state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('prj041 - Uppercamp HQ Design- Minutes08.md');
  const [uploadContent, setUploadContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState(null);

  // Stakeholder Edit / Add Modal state
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState(null);
  const [stakeholderForm, setStakeholderForm] = useState({
    name: '',
    role: '',
    organization: 'Citra',
    key_responsibilities: '',
    status: 'Active'
  });
  const [savingStakeholder, setSavingStakeholder] = useState(false);

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
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      const res = await fetch('/api/decisions');
      const data = await res.json();
      setDecisions(data.decisions || []);
      setDecisionsNarrative(data.narrative || null);
    } catch (err) {
      console.error('Error fetching decisions:', err);
    }
  };

  const fetchStakeholders = async () => {
    try {
      const res = await fetch('/api/stakeholders');
      const data = await res.json();
      if (Array.isArray(data)) {
        const uniqueMap = new Map();
        for (const item of data) {
          const cleanName = (item.name || '').replace(/^[\s\-\–\—•\*\d\.\:\)\(\\\`\#]+/, '').replace(/[\*\_\`]/g, '').trim();
          const normKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!uniqueMap.has(normKey)) {
            uniqueMap.set(normKey, { ...item, name: cleanName });
          } else {
            const existing = uniqueMap.get(normKey);
            const isExistingLead = (existing.role || '').toLowerCase().includes('lead') || (existing.role || '').toLowerCase().includes('manager');
            const isNewLead = (item.role || '').toLowerCase().includes('lead') || (item.role || '').toLowerCase().includes('manager');
            if (!isExistingLead && isNewLead) {
              uniqueMap.set(normKey, { ...item, name: cleanName });
            }
          }
        }
        setStakeholders(Array.from(uniqueMap.values()));
      } else {
        setStakeholders(data);
      }
    } catch (err) {
      console.error('Error fetching stakeholders:', err);
    }
  };

  const handleOpenAddStakeholder = () => {
    setEditingStakeholder(null);
    setStakeholderForm({
      name: '',
      role: '',
      organization: 'Citra',
      key_responsibilities: '',
      status: 'Active'
    });
    setShowStakeholderModal(true);
  };

  const handleOpenEditStakeholder = (person) => {
    setEditingStakeholder(person);
    setStakeholderForm({
      name: person.name || '',
      role: person.role || '',
      organization: person.organization || '',
      key_responsibilities: person.key_responsibilities || '',
      status: person.status || 'Active'
    });
    setShowStakeholderModal(true);
  };

  const handleSaveStakeholder = async (e) => {
    e.preventDefault();
    if (!stakeholderForm.name.trim() || !stakeholderForm.role.trim() || !stakeholderForm.organization.trim()) {
      alert('Name, Role, and Organization are required.');
      return;
    }

    setSavingStakeholder(true);
    try {
      const isEdit = Boolean(editingStakeholder?.id);
      const url = isEdit ? `/api/stakeholders/${editingStakeholder.id}` : '/api/stakeholders';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stakeholderForm)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        alert(`Failed to save: ${data.error || 'Unknown error'}`);
      } else {
        setShowStakeholderModal(false);
        setEditingStakeholder(null);
        fetchStakeholders();
      }
    } catch (err) {
      console.error('Error saving stakeholder:', err);
      alert('Error connecting to local server.');
    } finally {
      setSavingStakeholder(false);
    }
  };

  const handleDeleteStakeholder = async (id, name) => {
    if (!confirm(`Are you sure you want to delete ${name} from the team directory?`)) return;
    try {
      const res = await fetch(`/api/stakeholders/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(`Failed to delete: ${data.error || 'Unknown error'}`);
      } else {
        fetchStakeholders();
      }
    } catch (err) {
      console.error('Error deleting stakeholder:', err);
      alert('Error connecting to local server.');
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

  const handleStartEditDecision = (dec) => {
    setSelectedDecisionForEdit(dec);
    setEditDecisionForm({
      impact_area: dec.impact_area || '',
      summary: dec.summary || '',
      theme: dec.theme || 'General',
      rationale: dec.rationale || ''
    });
  };

  const handleSaveDecision = async (e) => {
    e.preventDefault();
    if (!selectedDecisionForEdit) return;
    setSavingDecision(true);
    try {
      const res = await fetch(`/api/decisions/${selectedDecisionForEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDecisionForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedDecisionForEdit(null);
        await fetchDecisions();
      } else {
        alert(`Save failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error saving decision:', err);
      alert('Error connecting to local server.');
    } finally {
      setSavingDecision(false);
    }
  };

  const handleRunDecisionAnalysis = async () => {
    setAnalyzingDecisions(true);
    try {
      const res = await fetch('/api/decisions/analyze', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDecisions(data.decisions || []);
        setDecisionsNarrative(data.narrative || null);
      }
    } catch (err) {
      console.error('Error running decision analysis:', err);
    } finally {
      setAnalyzingDecisions(false);
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
      await fetchDecisions();
      if (selectedMeetingId) fetchMeetingDetail(selectedMeetingId);
    } catch (err) {
      console.error('Ingestion error:', err);
    } finally {
      setIngesting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadContent(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleSaveAndProcessMeeting = async () => {
    if (!uploadFilename || !uploadContent) {
      alert('Please provide a filename and meeting markdown content.');
      return;
    }
    setUploading(true);
    setUploadStatusMsg('Saving file to Raw/ & processing into RAG...');
    try {
      const res = await fetch('/api/meetings/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFilename,
          content: uploadContent
        })
      });
      const data = await res.json();
      if (data.success) {
        setUploadStatusMsg('✅ Saved to Raw/ and ingested into RAG & Database!');
        await fetchMeetings();
        await fetchActions();
        await fetchRisks();
        await fetchBrief();
        await fetchStakeholders();
        if (data.meeting_id) {
          setSelectedMeetingId(data.meeting_id);
          fetchMeetingDetail(data.meeting_id);
        }
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadContent('');
          setUploadStatusMsg(null);
        }, 1200);
      } else {
        setUploadStatusMsg(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm(`Are you sure you want to delete meeting record ${meetingId}? This will remove its raw file and re-sync database & RAG.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchMeetings();
        await fetchActions();
        await fetchRisks();
        await fetchBrief();
        await fetchStakeholders();
        setSelectedMeetingId(null);
        setMeetingDetail(null);
      }
    } catch (err) {
      console.error('Delete meeting error:', err);
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
            className={`tab-btn ${activeTab === 'decisions' ? 'active' : ''}`}
            onClick={() => setActiveTab('decisions')}
          >
            <GitCommit size={16} /> Decision Timeline & Map ({decisions.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'rag' ? 'active' : ''}`}
            onClick={() => setActiveTab('rag')}
          >
            <MessageSquare size={16} /> RAG Intelligence
          </button>
          <button
            className={`tab-btn ${activeTab === 'intelligence' ? 'active' : ''}`}
            onClick={() => setActiveTab('intelligence')}
            style={{ background: activeTab === 'intelligence' ? 'rgba(56, 189, 248, 0.2)' : undefined, borderColor: activeTab === 'intelligence' ? 'var(--primary-cyan)' : undefined }}
          >
            <BrainCircuit size={16} style={{ color: 'var(--primary-cyan)' }} /> Project Intelligence
          </button>
          <button
            className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
            style={{ 
              background: activeTab === 'analysis' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(139, 92, 246, 0.25))' : undefined,
              borderColor: activeTab === 'analysis' ? 'var(--primary-cyan)' : undefined,
              color: activeTab === 'analysis' ? '#fff' : undefined,
              boxShadow: activeTab === 'analysis' ? '0 0 12px rgba(56, 189, 248, 0.3)' : undefined
            }}
          >
            <Sparkles size={16} style={{ color: activeTab === 'analysis' ? '#38bdf8' : '#a78bfa' }} /> Analysis Hub
          </button>
        </nav>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="tab-btn active"
            onClick={() => setShowUploadModal(true)}
            style={{ background: 'var(--primary-cyan)', color: '#090d16', fontWeight: 700 }}
          >
            <Upload size={16} /> Upload Summary to RAW
          </button>

          <button
            className="tab-btn"
            onClick={handleIngest}
            disabled={ingesting}
            style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'var(--border-highlight)' }}
          >
            <RefreshCw size={16} className={ingesting ? 'animate-spin' : ''} />
            {ingesting ? 'Parsing Raw Files...' : 'Re-Sync Minutes'}
          </button>
        </div>
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
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
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
                    <button
                      onClick={() => handleDeleteMeeting(meetingDetail.id)}
                      className="tab-btn"
                      title="Delete meeting record"
                      style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f87171', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
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

                {/* RISKS & ISSUES LOGGED */}
                {meetingDetail.risks && meetingDetail.risks.length > 0 && (
                  <div style={{ marginTop: '1.5rem' }}>
                    <h4 style={{ fontFamily: 'var(--font-heading)', color: '#f87171', marginBottom: '0.5rem' }}>
                      Risks & Issues Logged ({meetingDetail.risks.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {meetingDetail.risks.map((r, i) => (
                        <div key={i} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem 1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #f87171' }}>
                          <div>
                            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f3f4f6' }}>
                              <span style={{ color: '#c084fc', marginRight: '0.4rem', fontWeight: 700 }}>{r.risk_code || `RSK-${String(r.id).padStart(3, '0')}`}:</span>
                              {r.description}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                              <strong>Mitigation:</strong> {r.contingency_measure}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            <span className="badge badge-in-progress" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f87171', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                              Impact: {r.impact_level || 'High'}
                            </span>
                            <span className={`badge ${r.status === 'Closed' ? 'badge-completed' : 'badge-pending'}`}>
                              {r.status || 'Open'}
                            </span>
                          </div>
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
                            <div style={{ fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span className="badge badge-in-progress" style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', borderColor: 'rgba(251, 191, 36, 0.3)', fontWeight: 700 }}>
                                {a.action_code || `ACT-${String(a.id).padStart(3, '0')}`}
                              </span>
                              <span>{a.description}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Assigned to: {a.assignee} | Due: {a.due_date}</div>
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
                            onChange={(e) => setEditRiskForm({ ...editRiskForm, description: e.target.value })}
                            style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.88rem', marginTop: '0.2rem' }}
                            rows={2}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Mitigation / Contingency Measure:</label>
                          <textarea
                            value={editRiskForm.contingency_measure}
                            onChange={(e) => setEditRiskForm({ ...editRiskForm, contingency_measure: e.target.value })}
                            style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.88rem', marginTop: '0.2rem' }}
                            rows={2}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          <div>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block' }}>Impact Level:</label>
                            <select
                              value={editRiskForm.impact_level}
                              onChange={(e) => setEditRiskForm({ ...editRiskForm, impact_level: e.target.value })}
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
                              onChange={(e) => setEditRiskForm({ ...editRiskForm, likelihood: e.target.value })}
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
                              onChange={(e) => setEditRiskForm({ ...editRiskForm, status: e.target.value })}
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
                  <button
                    onClick={handleOpenAddStakeholder}
                    className="tab-btn active"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <UserPlus size={15} /> Add Team Member
                  </button>

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
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <h4 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#f3f4f6' }}>{person.name}</h4>
                                  <div style={{ fontSize: '0.78rem', color: orgColor, fontWeight: 600 }}>{person.role}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.35rem' }}>
                                  <button
                                    onClick={() => handleOpenEditStakeholder(person)}
                                    title="Edit Team Member Details"
                                    style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.3rem 0.5rem', color: 'var(--primary-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.74rem' }}
                                  >
                                    <Edit2 size={13} /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStakeholder(person.id, person.name)}
                                    title="Delete Member"
                                    style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '6px', padding: '0.3rem 0.45rem', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.74rem' }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
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

        {/* TAB 4: RAG INTELLIGENCE MODULE */}
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
                  <div key={idx} className={`chat-bubble ${msg.sender}`}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem', color: msg.sender === 'user' ? '#38bdf8' : '#a78bfa' }}>
                      {msg.sender === 'user' ? '👤 User Query' : '🤖 Uppercamp RAG Engine'}
                    </div>

                    {msg.keyTakeaways && msg.keyTakeaways.length > 0 && (
                      <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary-cyan)', marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary-cyan)', marginBottom: '0.3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>KEY TAKEAWAYS SUMMARY:</span>
                          <button
                            onClick={() => handleCopyResponse(msg.text, idx)}
                            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
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
                ))}
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

        {/* TAB 8: PROJECT INTELLIGENCE & EXPERIENCE HUB */}
        {activeTab === 'intelligence' && (
          <ProjectIntelligenceHub />
        )}

        {/* TAB 9: CONTINUOUS THEMATIC & QUALITATIVE ANALYSIS HUB */}
        {activeTab === 'analysis' && (
          <AnalysisHub />
        )}

        {/* TAB 5: DECISION TIMELINE & LOGIC MAP */}
        {activeTab === 'decisions' && (
          <div className="timeline-viewport">
            {/* Top Narrative Banner */}
            <div className="timeline-narrative-banner">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--primary-cyan)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BrainCircuit size={20} /> Decision Intelligence & Interactive Timeline
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '0.2rem', maxWidth: '900px' }}>
                    {decisionsNarrative?.executiveNarrative || 'Interactive decision evolution map across meeting events, grouped by auto-discovered themes.'}
                  </p>
                </div>
                <button
                  onClick={handleRunDecisionAnalysis}
                  disabled={analyzingDecisions}
                  className="tab-btn active"
                  style={{ background: 'linear-gradient(135deg, var(--primary-cyan), var(--primary-indigo))', color: '#fff', border: 'none', fontWeight: 700, padding: '0.5rem 1rem' }}
                >
                  <Sparkles size={16} className={analyzingDecisions ? 'animate-spin' : ''} />
                  {analyzingDecisions ? 'Analyzing Themes...' : 'Re-Discover Themes & Correlations'}
                </button>
              </div>

              {/* Theme Breakdown Chips & Metrics */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter Theme:</span>
                <button
                  className={`tab-btn ${selectedThemeFilter === 'All' ? 'active' : ''}`}
                  onClick={() => setSelectedThemeFilter('All')}
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                >
                  All Themes ({decisions.length})
                </button>
                {decisionsNarrative?.themeBreakdown && Object.entries(decisionsNarrative.themeBreakdown).map(([theme, count]) => (
                  <button
                    key={theme}
                    className={`tab-btn ${selectedThemeFilter === theme ? 'active' : ''}`}
                    onClick={() => setSelectedThemeFilter(theme)}
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    {theme} ({count})
                  </button>
                ))}
              </div>
            </div>

            {/* X-Axis Timeline Matrix View */}
            <div className="timeline-grid-wrapper">
              {(() => {
                // Collect unique meeting milestones sorted chronologically
                const uniqueMeetings = Array.from(
                  new Set(decisions.map(d => d.meeting_id))
                ).sort();

                // Collect unique themes
                const uniqueThemes = Array.from(
                  new Set(decisions.map(d => d.theme || 'General'))
                );

                const filteredThemes = selectedThemeFilter === 'All'
                  ? uniqueThemes
                  : uniqueThemes.filter(t => t === selectedThemeFilter);

                // Get selected correlation target IDs if any decision is highlighted
                const selectedDec = decisions.find(d => d.id === selectedCorrelationId);
                const linkedTargetIds = selectedDec && selectedDec.correlations
                  ? selectedDec.correlations.map(c => c.target_id)
                  : [];

                return (
                  <div>
                    {/* X-Axis Header Row (Meeting Events Timeline) */}
                    <div className="timeline-x-header">
                      <div className="timeline-theme-label-col">
                        Discovered Themes
                      </div>
                      {uniqueMeetings.map(mtgId => {
                        const sampleMtg = decisions.find(d => d.meeting_id === mtgId);
                        return (
                          <div key={mtgId} className="timeline-milestone-cell">
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-cyan)' }}>
                              {mtgId}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {sampleMtg?.meeting_date || ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Y-Axis Theme Rows */}
                    {filteredThemes.map(theme => (
                      <div key={theme} className="timeline-lane-row">
                        {/* Theme Label Column */}
                        <div className="timeline-theme-label-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                          <span>{theme}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 400 }}>
                            {decisions.filter(d => (d.theme || 'General') === theme).length} decision(s)
                          </span>
                        </div>

                        {/* Meeting Milestone Cells for this Theme */}
                        {uniqueMeetings.map(mtgId => {
                          const cellDecisions = decisions.filter(d => d.meeting_id === mtgId && (d.theme || 'General') === theme);

                          return (
                            <div key={mtgId} className="timeline-card-cell">
                              {cellDecisions.map(dec => {
                                const isSelected = selectedCorrelationId === dec.id;
                                const cardClass = `decision-timeline-card ${isSelected ? 'selected-correlation' : linkedTargetIds.includes(dec.id) ? 'linked-correlation' : ''}`;

                                return (
                                  <div key={dec.id} className={cardClass}>
                                    <div className="decision-card-header">
                                      <span className="decision-num-tag">
                                        Decision #{dec.decision_num || dec.id}
                                      </span>
                                      <span className="decision-impact-badge">
                                        {dec.impact_area}
                                      </span>
                                    </div>

                                    <div className="decision-summary-text">
                                      {dec.summary}
                                    </div>

                                    {dec.rationale && (
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.4rem' }}>
                                        "{dec.rationale}"
                                      </div>
                                    )}

                                    <div className="decision-card-footer">
                                      <button
                                        onClick={() => setSelectedCorrelationId(isSelected ? null : dec.id)}
                                        className="correlation-btn"
                                      >
                                        <Link2 size={12} />
                                        {dec.correlations ? dec.correlations.length : 0} links
                                      </button>
                                      <button
                                        onClick={() => handleStartEditDecision(dec)}
                                        className="edit-decision-btn"
                                      >
                                        <Edit2 size={12} /> Edit & Sync
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* EDIT DECISION MODAL WITH RAG & DB SYNC */}
        {selectedDecisionForEdit && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ background: '#0b1120', border: '1px solid var(--border-highlight)', borderRadius: '16px', width: '100%', maxWidth: '620px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <Edit2 color="var(--primary-cyan)" size={22} />
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--primary-cyan)' }}>
                    Edit Decision #{selectedDecisionForEdit.decision_num || selectedDecisionForEdit.id} ({selectedDecisionForEdit.meeting_id})
                  </h3>
                </div>
                <button onClick={() => setSelectedDecisionForEdit(null)} className="tab-btn" style={{ padding: '0.3rem 0.6rem' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', padding: '0.6rem 0.8rem', fontSize: '0.78rem', color: 'var(--primary-cyan)' }}>
                ⚡ Editing this decision will sync directly to the SQLite database, update the RAG vector store chunks, and re-calculate decision correlations.
              </div>

              <form onSubmit={handleSaveDecision} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Impact Area:</label>
                    <input
                      type="text"
                      value={editDecisionForm.impact_area}
                      onChange={(e) => setEditDecisionForm({ ...editDecisionForm, impact_area: e.target.value })}
                      style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.45rem 0.75rem', color: '#fff', fontSize: '0.85rem' }}
                      required
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Theme:</label>
                    <input
                      type="text"
                      value={editDecisionForm.theme}
                      onChange={(e) => setEditDecisionForm({ ...editDecisionForm, theme: e.target.value })}
                      style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.45rem 0.75rem', color: '#fff', fontSize: '0.85rem' }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Decision Summary:</label>
                  <textarea
                    value={editDecisionForm.summary}
                    onChange={(e) => setEditDecisionForm({ ...editDecisionForm, summary: e.target.value })}
                    rows={3}
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.85rem', lineHeight: '1.4' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem', fontWeight: 600 }}>Strategic Rationale / Notes:</label>
                  <textarea
                    value={editDecisionForm.rationale}
                    onChange={(e) => setEditDecisionForm({ ...editDecisionForm, rationale: e.target.value })}
                    rows={2}
                    placeholder="Optional rationale or context..."
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setSelectedDecisionForEdit(null)} className="tab-btn" style={{ padding: '0.5rem 1rem' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={savingDecision} className="tab-btn active" style={{ background: 'var(--primary-cyan)', color: '#090d16', fontWeight: 700, padding: '0.5rem 1.25rem' }}>
                    {savingDecision ? 'Syncing to DB & RAG...' : 'Save & Sync Decision'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* UPLOAD MEETING SUMMARY TO RAW MODAL */}
        {showUploadModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ background: '#0b1120', border: '1px solid var(--border-color)', borderRadius: '16px', width: '100%', maxWidth: '680px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <Upload color="var(--primary-cyan)" size={22} />
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: 'var(--primary-cyan)' }}>
                    Upload Meeting Summary to RAW & Index into RAG
                  </h3>
                </div>
                <button onClick={() => setShowUploadModal(false)} className="tab-btn" style={{ padding: '0.3rem 0.6rem' }}>
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                Add a new meeting markdown summary. It will be saved directly to the <code style={{ color: '#38bdf8' }}>Raw/</code> directory, parsed into SQLite, and indexed into the RAG vector store.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Target Filename in <code style={{ color: '#38bdf8' }}>Raw/</code>:
                  </label>
                  <input
                    type="text"
                    value={uploadFilename}
                    onChange={(e) => setUploadFilename(e.target.value)}
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '0.85rem', borderRadius: '10px', border: '1px border-color' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                    Option A: Select Markdown File (.md / .txt):
                  </label>
                  <input
                    type="file"
                    accept=".md,.txt"
                    onChange={handleFileUpload}
                    style={{ fontSize: '0.82rem', color: 'var(--text-muted)', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Option B: Paste Raw Markdown Content:
                  </label>
                  <textarea
                    rows={9}
                    placeholder="# prj041 - UC 6A Design: Uppercamp Offices&#10;&#10;## Meeting Details...&#10;* **Date**: 2026-08-05&#10;* **Location**: Google Meet&#10;..."
                    value={uploadContent}
                    onChange={(e) => setUploadContent(e.target.value)}
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', color: '#cbd5e1', fontSize: '0.82rem', fontFamily: 'monospace', lineHeight: '1.4' }}
                  />
                </div>
              </div>

              {uploadStatusMsg && (
                <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: uploadStatusMsg.includes('❌') ? 'rgba(244, 63, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)', border: uploadStatusMsg.includes('❌') ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border-highlight)', fontSize: '0.85rem', color: uploadStatusMsg.includes('❌') ? '#f87171' : '#38bdf8', fontWeight: 600 }}>
                  {uploadStatusMsg}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowUploadModal(false)} className="tab-btn">
                  Cancel
                </button>
                <button
                  onClick={handleSaveAndProcessMeeting}
                  disabled={uploading || !uploadContent}
                  className="tab-btn active"
                  style={{ background: 'var(--primary-cyan)', color: '#090d16', fontWeight: 700, padding: '0.45rem 1rem' }}
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Processing into RAG...
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Save to RAW & Index into RAG
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STAKEHOLDER EDIT / ADD MODAL persisting to SQLite DB */}
        {showStakeholderModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ background: '#0f172a', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '540px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <UserPlus size={20} style={{ color: 'var(--primary-cyan)' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f3f4f6', fontFamily: 'var(--font-heading)' }}>
                    {editingStakeholder ? 'Edit Team Member Details' : 'Add New Team Member'}
                  </h3>
                </div>
                <button onClick={() => setShowStakeholderModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveStakeholder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={stakeholderForm.name}
                    onChange={(e) => setStakeholderForm({ ...stakeholderForm, name: e.target.value })}
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Role / Designation *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lead Architect"
                      value={stakeholderForm.role}
                      onChange={(e) => setStakeholderForm({ ...stakeholderForm, role: e.target.value })}
                      style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                      Organization *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Citra / Kim Williams Design"
                      value={stakeholderForm.organization}
                      onChange={(e) => setStakeholderForm({ ...stakeholderForm, organization: e.target.value })}
                      style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Key Responsibilities
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe main scope of work, sign-off authorities, or deliverables..."
                    value={stakeholderForm.key_responsibilities}
                    onChange={(e) => setStakeholderForm({ ...stakeholderForm, key_responsibilities: e.target.value })}
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.6rem 0.75rem', color: '#cbd5e1', fontSize: '0.84rem', lineHeight: '1.4' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                    Status
                  </label>
                  <select
                    value={stakeholderForm.status}
                    onChange={(e) => setStakeholderForm({ ...stakeholderForm, status: e.target.value })}
                    style={{ width: '100%', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.55rem 0.75rem', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <button type="button" onClick={() => setShowStakeholderModal(false)} className="tab-btn">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingStakeholder}
                    className="tab-btn active"
                    style={{ padding: '0.5rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                  >
                    {savingStakeholder ? <RefreshCw size={15} className="spin" /> : <Save size={15} />}
                    {savingStakeholder ? 'Saving to Database...' : 'Save & Update Database'}
                  </button>
                </div>
              </form>
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
                      onChange={(e) => setEditActionForm({ ...editActionForm, description: e.target.value })}
                      style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem', fontSize: '0.82rem', marginTop: '0.2rem' }}
                      rows={2}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Assignee:</label>
                    <input
                      type="text"
                      value={editActionForm.assignee}
                      onChange={(e) => setEditActionForm({ ...editActionForm, assignee: e.target.value })}
                      style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem 0.5rem', fontSize: '0.82rem', marginTop: '0.2rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Due Date:</label>
                      <input
                        type="text"
                        value={editActionForm.due_date}
                        onChange={(e) => setEditActionForm({ ...editActionForm, due_date: e.target.value })}
                        style={{ width: '100%', background: 'rgba(30, 41, 59, 0.9)', color: '#fff', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.8rem', marginTop: '0.2rem' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Status:</label>
                      <select
                        value={editActionForm.status}
                        onChange={(e) => setEditActionForm({ ...editActionForm, status: e.target.value })}
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
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span className="badge badge-in-progress" style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.15)', borderColor: 'rgba(251, 191, 36, 0.3)', fontWeight: 700, fontSize: '0.72rem' }}>
                        {item.action_code || `ACT-${String(item.id).padStart(3, '0')}`}
                      </span>
                      <span className="badge badge-in-progress" style={{ fontSize: '0.7rem' }}>{item.meeting_id}</span>
                    </div>
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
