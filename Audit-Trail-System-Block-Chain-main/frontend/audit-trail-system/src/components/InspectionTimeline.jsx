import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/api';

const REFRESH_INTERVAL_MS = 8000;

function formatTimestamp(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function InspectionTimeline({ reportId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadTimeline = useCallback(
    async (options = {}) => {
      const { silent = false } = options;
      if (!reportId) return;

      if (!silent) {
        setLoading(true);
        setError('');
      }

      try {
        const data = await api.getInspectionTimeline(reportId);
        setTimeline(data.timeline || []);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Timeline error', err);
        setError('Failed to load timeline');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [reportId]
  );

  useEffect(() => {
    if (!reportId) return undefined;
    loadTimeline();
    return undefined;
  }, [reportId, loadTimeline]);

  useEffect(() => {
    if (!reportId) return undefined;

    const intervalId = setInterval(() => {
      loadTimeline({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [reportId, loadTimeline]);

  if (!reportId) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Inspection Timeline</h3>
          {lastUpdated && (
            <p className="text-xs text-slate-500">
              Auto refresh every {Math.floor(REFRESH_INTERVAL_MS / 1000)}s. Last updated {lastUpdated.toLocaleTimeString()}.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading && <span className="text-sm text-slate-500">Loading...</span>}
          <button
            type="button"
            onClick={() => loadTimeline()}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      )}

      {!loading && !error && (
        <ul className="mt-4 space-y-3">
          {timeline.length === 0 && (
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No timeline events yet.
            </li>
          )}
          {timeline.map((event, idx) => (
            <li key={`${event.type}-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">{event.type}</span>
                <span className="text-xs font-medium text-slate-500">{formatTimestamp(event.timestamp)}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {event.status && (
                  <p>
                    <span className="font-semibold text-slate-700">Status:</span> {event.status}
                  </p>
                )}
                {event.actor && (
                  <p>
                    <span className="font-semibold text-slate-700">Actor:</span> {event.actor}
                  </p>
                )}
                {event.txHash && (
                  <p>
                    <span className="font-semibold text-slate-700">Tx:</span>{' '}
                    <code className="rounded bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600">{event.txHash}</code>
                  </p>
                )}
                {event.details && <p>{event.details}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
