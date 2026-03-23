import { useState } from 'react';
import InspectionTimeline from '../components/InspectionTimeline';

export default function AuditLogs() {
  const [reportId, setReportId] = useState('');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Audit Logs</h1>
            <p className="mt-1 text-sm text-slate-500">
              View the audit trail for inspections and blockchain events.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              placeholder="Enter report ID"
              className="w-full min-w-[240px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <button
              type="button"
              onClick={() => setReportId(reportId.trim())}
              className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Show Timeline
            </button>
          </div>
        </div>
      </div>

      {reportId ? (
        <InspectionTimeline reportId={reportId} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center">
          <p className="text-sm text-slate-600">
            Enter a report ID above to load its audit timeline.
          </p>
        </div>
      )}
    </div>
  );
}
