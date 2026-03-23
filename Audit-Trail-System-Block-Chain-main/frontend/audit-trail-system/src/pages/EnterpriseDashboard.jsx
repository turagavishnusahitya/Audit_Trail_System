import { useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import LiveIntegrityVerificationPanel from '../components/enterprise/LiveIntegrityVerificationPanel';
import InspectionLifecycleVisualization from '../components/enterprise/InspectionLifecycleVisualization';
import TamperingSimulationPanel from '../components/enterprise/TamperingSimulationPanel';
import BlockchainActivityExplorerPanel from '../components/enterprise/BlockchainActivityExplorerPanel';
import GasCostAnalyticsPanel from '../components/enterprise/GasCostAnalyticsPanel';
import HybridStorageArchitecture from '../components/enterprise/HybridStorageArchitecture';
import RoleAccessMatrix from '../components/enterprise/RoleAccessMatrix';
import VerificationLatencyAnalyticsPanel from '../components/enterprise/VerificationLatencyAnalyticsPanel';
import AuditTrailTimelinePanel from '../components/enterprise/AuditTrailTimelinePanel';
import WhyBlockchainSection from '../components/enterprise/WhyBlockchainSection';
import RoleBadge from '../components/enterprise/RoleBadge';

export default function EnterpriseDashboard() {
  const { role } = useBlockchain();
  const [reportId, setReportId] = useState('');
  const [activeReportId, setActiveReportId] = useState('');
  const [inspectionTimeline, setInspectionTimeline] = useState([]);
  const [activityRecords, setActivityRecords] = useState([]);

  const openReport = () => {
    setActiveReportId(reportId.trim());
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Enterprise-Grade Blockchain Audit Platform</h1>
            <p className="mt-1 text-sm text-slate-500">
              Data integrity, traceability, immutability, transparency, and non-repudiation in one research-ready console.
            </p>
          </div>
          <RoleBadge role={role} />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            placeholder="Enter Report ID for enterprise analysis"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="button"
            onClick={openReport}
            className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Load Report Context
          </button>
        </div>

        {activeReportId && (
          <p className="mt-3 text-xs text-slate-500">
            Active report context: <span className="font-mono">{activeReportId}</span>
          </p>
        )}
      </section>

      <LiveIntegrityVerificationPanel
        reportId={activeReportId}
        onVerificationComplete={(payload) => {
          setInspectionTimeline(payload.timeline || []);
        }}
      />

      <TamperingSimulationPanel
        reportId={activeReportId}
        onSimulationComplete={() => {
          // Verification panel can be re-run manually to demonstrate mismatch.
        }}
      />

      <InspectionLifecycleVisualization timeline={inspectionTimeline} />

      <AuditTrailTimelinePanel reportId={activeReportId} />

      <BlockchainActivityExplorerPanel onRecordsChange={setActivityRecords} />

      <GasCostAnalyticsPanel activityRecords={activityRecords} />

      <VerificationLatencyAnalyticsPanel />

      <HybridStorageArchitecture />

      <RoleAccessMatrix />

      <WhyBlockchainSection />
    </div>
  );
}
