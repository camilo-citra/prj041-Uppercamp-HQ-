import React from 'react';
import { ShieldCheck, TrendingUp, CheckCircle, AlertTriangle, Layers, DollarSign, Calendar, Users, Printer, X } from 'lucide-react';

export default function ExecutivePdfReport({ financialData, onClose }) {
  if (!financialData) return null;

  const { budget, savings, actionStats, meetingTrajectory, simpleTermsGuide } = financialData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pdf-modal-overlay">
      <div className="pdf-modal-toolbar no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem' }}>
            📄 Board Executive Summary & Financial Audit (A4 Print Ready)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handlePrint} className="pdf-print-btn">
            <Printer size={16} /> Print or Save as PDF
          </button>
          <button onClick={onClose} className="pdf-close-btn">
            <X size={18} /> Close
          </button>
        </div>
      </div>

      <div className="pdf-document-sheet" id="executive-pdf-content">
        {/* Document Header */}
        <header className="pdf-header">
          <div className="pdf-header-left">
            <div className="pdf-logo-badge">UC</div>
            <div>
              <h1 className="pdf-title">prj041 - Uppercamp HQ</h1>
              <p className="pdf-subtitle">Commercial Real Estate Governance & Financial ROI Report</p>
            </div>
          </div>
          <div className="pdf-header-right">
            <div className="pdf-meta-item"><strong>Date:</strong> {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div className="pdf-meta-item"><strong>Project Baseline:</strong> Approved CapEx R12,000,000</div>
            <div className="pdf-meta-item"><strong>Location:</strong> 6 Upper Camp Road</div>
          </div>
        </header>

        {/* Executive Summary Banner */}
        <section className="pdf-summary-banner">
          <div className="pdf-banner-item">
            <span className="pdf-banner-label">TOTAL APPROVED BUDGET</span>
            <span className="pdf-banner-value">R {budget.total.toLocaleString()}</span>
            <span className="pdf-banner-sub">Construction + Professional Fees</span>
          </div>
          <div className="pdf-banner-item highlight-green">
            <span className="pdf-banner-label">CUMULATIVE PROTECTED VALUE</span>
            <span className="pdf-banner-value">R {savings.total.toLocaleString()}</span>
            <span className="pdf-banner-sub"><strong>{savings.budgetDefenseRatePct}%</strong> of Total Budget Defended</span>
          </div>
          <div className="pdf-banner-item">
            <span className="pdf-banner-label">CONTINGENCY HEALTH</span>
            <span className="pdf-banner-value">R {budget.contingencyRemaining.toLocaleString()}</span>
            <span className="pdf-banner-sub">100% Intact (0 Unapproved Variations)</span>
          </div>
          <div className="pdf-banner-item">
            <span className="pdf-banner-label">ACTION ITEM VELOCITY</span>
            <span className="pdf-banner-value">{savings.breakdown.actionVelocityAndSchedule.velocityPct}%</span>
            <span className="pdf-banner-sub">{actionStats.completed} of {actionStats.total} Tasks Closed</span>
          </div>
        </section>

        {/* Financial Allocation & Savings Breakdown Table */}
        <section className="pdf-section">
          <h2 className="pdf-section-title">1. Budget Allocation & Capital Protection Matrix</h2>
          <div className="pdf-two-col">
            <table className="pdf-table">
              <thead>
                <tr>
                  <th>CapEx Component</th>
                  <th>Budget Allocation (ZAR)</th>
                  <th>% of CapEx</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Hard Construction Works</strong></td>
                  <td>R {budget.constructionHardCosts.toLocaleString()}</td>
                  <td>78.0%</td>
                  <td><span className="pdf-badge green">Under Control</span></td>
                </tr>
                <tr>
                  <td><strong>Professional & Consultant Fees</strong></td>
                  <td>R {budget.professionalFees.toLocaleString()}</td>
                  <td>14.0%</td>
                  <td><span className="pdf-badge blue">Active (6 Trades)</span></td>
                </tr>
                <tr>
                  <td><strong>Emergency Contingency Reserve</strong></td>
                  <td>R {budget.contingencyReserve.toLocaleString()}</td>
                  <td>8.0%</td>
                  <td><span className="pdf-badge green">100% Preserved</span></td>
                </tr>
                <tr className="pdf-table-total">
                  <td><strong>TOTAL PROJECT CAPEX</strong></td>
                  <td><strong>R {budget.total.toLocaleString()}</strong></td>
                  <td><strong>100.0%</strong></td>
                  <td><strong>Approved Baseline</strong></td>
                </tr>
              </tbody>
            </table>

            <table className="pdf-table">
              <thead>
                <tr>
                  <th>Protected Savings Pillar</th>
                  <th>Estimated Value</th>
                  <th>% of Savings</th>
                  <th>Key Operational Driver</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Closed Risk Mitigation</strong></td>
                  <td>R {savings.breakdown.riskMitigation.amount.toLocaleString()}</td>
                  <td>{savings.breakdown.riskMitigation.percentageOfTotal}%</td>
                  <td>{savings.breakdown.riskMitigation.closedHighCount} High & {savings.breakdown.riskMitigation.closedMedCount} Med Risks Closed</td>
                </tr>
                <tr>
                  <td><strong>Avoided Rework (Design Phase)</strong></td>
                  <td>R {savings.breakdown.avoidedRework.amount.toLocaleString()}</td>
                  <td>{savings.breakdown.avoidedRework.percentageOfTotal}%</td>
                  <td>{savings.breakdown.avoidedRework.invalidatedCount} Flawed Assumptions Invalidated Pre-Build</td>
                </tr>
                <tr>
                  <td><strong>Action Velocity & Schedule</strong></td>
                  <td>R {savings.breakdown.actionVelocityAndSchedule.amount.toLocaleString()}</td>
                  <td>{savings.breakdown.actionVelocityAndSchedule.percentageOfTotal}%</td>
                  <td>{savings.breakdown.actionVelocityAndSchedule.monthsCompressed} Months Schedule Delay Avoided</td>
                </tr>
                <tr>
                  <td><strong>Dispute & Claim Defense</strong></td>
                  <td>R {savings.breakdown.disputeDefense.amount.toLocaleString()}</td>
                  <td>{savings.breakdown.disputeDefense.percentageOfTotal}%</td>
                  <td>{savings.breakdown.disputeDefense.budgetDecisionsCount} Codified Budget Decisions</td>
                </tr>
                <tr className="pdf-table-total">
                  <td><strong>TOTAL VALUE PROTECTED</strong></td>
                  <td><strong>R {savings.total.toLocaleString()}</strong></td>
                  <td><strong>100.0%</strong></td>
                  <td><strong>Net Capital Safeguard</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Plain English Guide for Shareholders */}
        <section className="pdf-section">
          <h2 className="pdf-section-title">2. Plain-English Financial Governance Explanations</h2>
          <div className="pdf-callout-grid">
            <div className="pdf-callout-box">
              <h3>🛡️ Avoided Rework</h3>
              <p>Catching and invalidating false architectural assumptions (e.g. lift shaft excavation constraints and roof terrace stair widths) during concept design costs ~R5k in CAD revisions vs. R200k+ in on-site concrete demolition.</p>
            </div>
            <div className="pdf-callout-box">
              <h3>⚡ Schedule & Holding Costs</h3>
              <p>Keeping task turnaround times to under 15 minutes prevents project stagnation, avoiding monthly bank debt carrying costs and site security fees (~R180k/mo).</p>
            </div>
            <div className="pdf-callout-box">
              <h3>📜 Dispute & Variation Immunity</h3>
              <p>Every decision is timestamped and mapped to Gemini transcripts, eliminating unsubstantiated contractor claims and costly arbitration proceedings.</p>
            </div>
          </div>
        </section>

        {/* Meeting Progression Trajectory */}
        <section className="pdf-section">
          <h2 className="pdf-section-title">3. Chronological Cumulative Savings Trajectory</h2>
          <table className="pdf-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Meeting Focus</th>
                <th>Date</th>
                <th>Actions Closed</th>
                <th>Risks Mitigated</th>
                <th>Cumulative Savings</th>
              </tr>
            </thead>
            <tbody>
              {meetingTrajectory.map((m, idx) => (
                <tr key={m.meeting_id}>
                  <td><strong>{m.meeting_id}</strong></td>
                  <td>{m.title}</td>
                  <td>{m.date}</td>
                  <td>{m.actionsCompleted}</td>
                  <td>{m.risksClosed}</td>
                  <td><strong>R {m.cumulativeSavings.toLocaleString()}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Fiduciary Governance Sign-Off */}
        <footer className="pdf-footer-signoff">
          <div className="pdf-sign-box">
            <span className="pdf-sign-label">Prepared by Lead Project Manager</span>
            <div className="pdf-sign-line"></div>
            <span className="pdf-sign-name">John Walter Shaidi / Citra PM</span>
          </div>
          <div className="pdf-sign-box">
            <span className="pdf-sign-label">Verified Lead Architect & Fire Eng.</span>
            <div className="pdf-sign-line"></div>
            <span className="pdf-sign-name">Kim Williams Design / Pieter Fourie</span>
          </div>
          <div className="pdf-sign-box">
            <span className="pdf-sign-label">Approved Shareholder / Investment Board</span>
            <div className="pdf-sign-line"></div>
            <span className="pdf-sign-name">Executive Development Committee</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
