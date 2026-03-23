import { useCallback, useEffect, useState } from 'react';
import { api } from '../../utils/api';

export default function AuditTrailTimelinePanel({ reportId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTimeline = useCallback(async () => {
    if (!reportId) return;

    setLoading(true);
    setError('');
    try {
      const response = await api.getInspectionTimeline(reportId);
      setTimeline(response.timeline || []);
    } catch (err) {
      console.error('Audit timeline load failed:', err);
      setError(err.message || 'Failed to load audit timeline');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (!reportId) return undefined;
    loadTimeline();
    return undefined;
  }, [reportId, loadTimeline]);

  useEffect(() => {
    if (!reportId) return undefined;
    const intervalId = setInterval(loadTimeline, 8000);
    return () => clearInterval(intervalId);
  }, [reportId, loadTimeline]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Audit Trail Timeline</h2>
      <p className="mt-1 text-sm text-slate-500">
        Complete history with timestamp, actor, action, and transaction proof.
      </p>

      {!reportId && <p className="mt-4 text-sm text-slate-500">Enter a report ID to load full timeline.</p>}
      {loading && <p className="mt-4 text-sm text-slate-500">Loading timeline...</p>}
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {!loading && !error && reportId && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {timeline.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={4}>
                    No audit entries yet.
                  </td>
                </tr>
              )}
              {timeline.map((entry, index) => (
                <tr key={`${entry.type}-${entry.timestamp}-${index}`}>
                  <td className="px-3 py-3">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}</td>
                  <td className="px-3 py-3">{entry.type || '-'}</td>
                  <td className="px-3 py-3 break-all">{entry.actor || '-'}</td>
                  <td className="px-3 py-3 break-all text-xs font-mono">{entry.txHash || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
