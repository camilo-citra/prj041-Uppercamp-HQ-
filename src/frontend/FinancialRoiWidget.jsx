import React, { useState } from 'react';
import {
  TrendingUp, ShieldCheck, DollarSign, CheckCircle2, AlertTriangle,
  HelpCircle, ChevronDown, ChevronUp, FileText, Download, RefreshCw,
  Clock, Award, BarChart3, Layers, Info
} from 'lucide-react';
import ExecutivePdfReport from './ExecutivePdfReport.jsx';

export default function FinancialRoiWidget({ financialData, loading, onRefresh }) {
  const [showSimpleTerms, setShowSimpleTerms] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  if (loading || !financialData) {
    return (
      <div className="financial-widget-loading-card">
        <RefreshCw size={24} className="animate-spin text-cyan-600" />
        <span>Calculating live project financial metrics & cumulative savings...</span>
      </div>
    );
  }

  const { budget, savings, actionStats, meetingTrajectory, simpleTermsGuide } = financialData;

  return (
    <section className="financial-roi-widget-light">
      {/* Widget Header Strip */}
      <div className="widget-header-light">
        <div className="widget-title-group">
          <div className="widget-icon-pill">
            <DollarSign size={20} color="#0284c7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 className="widget-main-title">Financial ROI & Capital Governance Engine</h2>
              <span className="budget-tag-light">Approved Budget: R 12,000,000</span>
              <span className="live-pill-light">● Live Intake Synced</span>
            </div>
            <p className="widget-sub-title">
              Real-time capital preservation tracker based on closed risks, action item velocity, and avoided rework across 11 project meetings.
            </p>
          </div>
        </div>

        <div className="widget-actions-light">
          <button
            onClick={() => setShowSimpleTerms(!showSimpleTerms)}
            className={`btn-widget-toggle ${showSimpleTerms ? 'active' : ''}`}
            title="Toggle plain-English explanation"
          >
            <HelpCircle size={15} />
            <span>Simple Terms</span>
            {showSimpleTerms ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          <button
            onClick={() => setShowPdfModal(true)}
            className="btn-widget-pdf"
            title="One-Click Board Executive PDF Export"
          >
            <FileText size={15} />
            <span>One-Click PDF Export</span>
          </button>

          <button
            onClick={onRefresh}
            className="btn-widget-refresh"
            title="Recalculate with latest meeting intake"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Simple Terms Plain-English Interactive Drawer */}
      {showSimpleTerms && (
        <div className="simple-terms-drawer-light">
          <div className="simple-terms-header">
            <Info size={18} color="#0284c7" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              How This Financial Widget Works (Plain English Guide)
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            {simpleTermsGuide.summary}
          </p>
          <div className="simple-terms-grid">
            {simpleTermsGuide.pillars.map((p, idx) => (
              <div key={idx} className="simple-term-card">
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1', marginBottom: '0.25rem' }}>
                  {p.title}
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.45 }}>
                  {p.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 4 Financial Summary KPI Metric Cards */}
      <div className="roi-kpi-grid-light">
        {/* KPI 1: Total CapEx Budget */}
        <div className="roi-kpi-card-light">
          <span className="roi-kpi-label">TOTAL APPROVED BUDGET</span>
          <div className="roi-kpi-number-row">
            <span className="roi-kpi-val">R {budget.total.toLocaleString()}</span>
          </div>
          <div className="roi-kpi-sub-row">
            <span>Const: R{(budget.constructionHardCosts / 1000000).toFixed(2)}M</span>
            <span>•</span>
            <span>Fees: R{(budget.professionalFees / 1000000).toFixed(2)}M</span>
          </div>
          <div className="roi-progress-track">
            <div className="roi-progress-fill" style={{ width: '100%', background: '#3b82f6' }}></div>
          </div>
        </div>

        {/* KPI 2: Cumulative Protected Value */}
        <div className="roi-kpi-card-light highlight-green">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="roi-kpi-label">PROTECTED VALUE & SAVINGS</span>
            <span className="roi-badge-pill green">+{savings.budgetDefenseRatePct}% Saved</span>
          </div>
          <div className="roi-kpi-number-row">
            <span className="roi-kpi-val text-green-700">R {savings.total.toLocaleString()}</span>
          </div>
          <div className="roi-kpi-sub-row">
            <span>Defended via Early Design Governance</span>
          </div>
          <div className="roi-progress-track">
            <div className="roi-progress-fill" style={{ width: `${Math.min(100, savings.budgetDefenseRatePct * 3.5)}%`, background: '#059669' }}></div>
          </div>
        </div>

        {/* KPI 3: Contingency Health */}
        <div className="roi-kpi-card-light">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="roi-kpi-label">CONTINGENCY RESERVE</span>
            <span className="roi-badge-pill green">100% Intact</span>
          </div>
          <div className="roi-kpi-number-row">
            <span className="roi-kpi-val">R {budget.contingencyRemaining.toLocaleString()}</span>
          </div>
          <div className="roi-kpi-sub-row">
            <span>R 0 Unapproved Variations Incurred</span>
          </div>
          <div className="roi-progress-track">
            <div className="roi-progress-fill" style={{ width: '100%', background: '#10b981' }}></div>
          </div>
        </div>

        {/* KPI 4: Action Velocity & Delay Avoided */}
        <div className="roi-kpi-card-light">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="roi-kpi-label">ACTION ITEM VELOCITY</span>
            <span className="roi-badge-pill blue">{savings.breakdown.actionVelocityAndSchedule.velocityPct}% Closed</span>
          </div>
          <div className="roi-kpi-number-row">
            <span className="roi-kpi-val">{actionStats.completed} / {actionStats.total}</span>
          </div>
          <div className="roi-kpi-sub-row">
            <span>~{savings.breakdown.actionVelocityAndSchedule.monthsCompressed} Months Delay Avoided</span>
          </div>
          <div className="roi-progress-track">
            <div className="roi-progress-fill" style={{ width: `${savings.breakdown.actionVelocityAndSchedule.velocityPct}%`, background: '#0284c7' }}></div>
          </div>
        </div>
      </div>

      {/* 4 Value Pillars Breakdown */}
      <div className="roi-pillars-section-light">
        <h3 className="roi-pillars-title">Capital Preservation Composition (By Value Driver)</h3>
        <div className="roi-pillars-grid-light">
          {/* Pillar 1: Risk Mitigation */}
          <div className="roi-pillar-card-light">
            <div className="pillar-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={18} color="#059669" />
                <span className="pillar-name">Closed Risk Mitigation</span>
              </div>
              <span className="pillar-pct-badge">{savings.breakdown.riskMitigation.percentageOfTotal}%</span>
            </div>
            <div className="pillar-amount-light">R {savings.breakdown.riskMitigation.amount.toLocaleString()}</div>
            <p className="pillar-desc-light">
              Avoided structural & fire hazard losses ({savings.breakdown.riskMitigation.closedHighCount} High + {savings.breakdown.riskMitigation.closedMedCount} Med risks neutralized before procurement).
            </p>
            <div className="roi-progress-track">
              <div className="roi-progress-fill" style={{ width: `${savings.breakdown.riskMitigation.percentageOfTotal}%`, background: '#059669' }}></div>
            </div>
          </div>

          {/* Pillar 2: Avoided Rework */}
          <div className="roi-pillar-card-light">
            <div className="pillar-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={18} color="#0284c7" />
                <span className="pillar-name">Avoided Site Rework</span>
              </div>
              <span className="pillar-pct-badge">{savings.breakdown.avoidedRework.percentageOfTotal}%</span>
            </div>
            <div className="pillar-amount-light">R {savings.breakdown.avoidedRework.amount.toLocaleString()}</div>
            <p className="pillar-desc-light">
              {savings.breakdown.avoidedRework.invalidatedCount} flawed assumptions invalidated in CAD/concept rather than tearing down walls on site.
            </p>
            <div className="roi-progress-track">
              <div className="roi-progress-fill" style={{ width: `${savings.breakdown.avoidedRework.percentageOfTotal}%`, background: '#0284c7' }}></div>
            </div>
          </div>

          {/* Pillar 3: Action Velocity & Labor */}
          <div className="roi-pillar-card-light">
            <div className="pillar-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={18} color="#6366f1" />
                <span className="pillar-name">Action Speed & Schedule</span>
              </div>
              <span className="pillar-pct-badge">{savings.breakdown.actionVelocityAndSchedule.percentageOfTotal}%</span>
            </div>
            <div className="pillar-amount-light">R {savings.breakdown.actionVelocityAndSchedule.amount.toLocaleString()}</div>
            <p className="pillar-desc-light">
              {savings.breakdown.actionVelocityAndSchedule.laborHoursSaved} consultant hours saved (R{savings.breakdown.actionVelocityAndSchedule.directLaborSavings.toLocaleString()}) + R{savings.breakdown.actionVelocityAndSchedule.scheduleHoldingSavings.toLocaleString()} in site holding costs.
            </p>
            <div className="roi-progress-track">
              <div className="roi-progress-fill" style={{ width: `${savings.breakdown.actionVelocityAndSchedule.percentageOfTotal}%`, background: '#6366f1' }}></div>
            </div>
          </div>

          {/* Pillar 4: Dispute Defense */}
          <div className="roi-pillar-card-light">
            <div className="pillar-header-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Award size={18} color="#d97706" />
                <span className="pillar-name">Variation Claim Defense</span>
              </div>
              <span className="pillar-pct-badge">{savings.breakdown.disputeDefense.percentageOfTotal}%</span>
            </div>
            <div className="pillar-amount-light">R {savings.breakdown.disputeDefense.amount.toLocaleString()}</div>
            <p className="pillar-desc-light">
              {savings.breakdown.disputeDefense.budgetDecisionsCount} timestamped budget sign-offs protecting against unsubstantiated contractor claims.
            </p>
            <div className="roi-progress-track">
              <div className="roi-progress-fill" style={{ width: `${savings.breakdown.disputeDefense.percentageOfTotal}%`, background: '#d97706' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Chronological Savings Progression Trajectory */}
      <div className="roi-trajectory-section-light">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <h3 className="roi-pillars-title" style={{ margin: 0 }}>
            Cumulative Savings Progression by Meeting Session ({meetingTrajectory.length} Ingested Sessions)
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Updates automatically with every new minute uploaded
          </span>
        </div>

        <div className="roi-trajectory-bars">
          {meetingTrajectory.map((m, idx) => {
            const maxVal = savings.total || 1;
            const heightPct = Math.max(15, Math.min(100, Math.round((m.cumulativeSavings / maxVal) * 100)));
            return (
              <div key={m.meeting_id} className="roi-bar-col" title={`${m.meeting_id} (${m.date}): R${m.cumulativeSavings.toLocaleString()} cumulative`}>
                <span className="roi-bar-val">R{(m.cumulativeSavings / 1000).toFixed(0)}k</span>
                <div className="roi-bar-container">
                  <div
                    className="roi-bar-fill"
                    style={{ height: `${heightPct}%`, background: `linear-gradient(to top, #0284c7, #38bdf8)` }}
                  ></div>
                </div>
                <span className="roi-bar-label">{m.meeting_id.replace('Minutes', 'M')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Printable PDF Modal */}
      {showPdfModal && (
        <ExecutivePdfReport
          financialData={financialData}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </section>
  );
}
