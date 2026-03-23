import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';

const EVENT_TYPES = [
  'InspectionCreated',
  'InspectionSubmitted',
  'InspectionApproved',
  'InspectionRejected',
  'FileUploaded',
  'FileVerified',
  'FileTamperingDetected',
];

const REFRESH_INTERVAL_MS = 10000;

function toDisplayValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object' && value.hash) {
    return String(value.hash);
  }
  try {
    return String(value);
  } catch {
    return '';
  }
}

export default function BlockchainActivityPanel() {
  const { contract } = useBlockchain();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const supported = useMemo(() => !!contract, [contract]);

  const loadEvents = useCallback(
    async (options = {}) => {
      const { silent = false } = options;

      if (!contract) return;
      if (!silent) {
        setLoading(true);
        setError('');
      }

      try {
        const allEvents = [];
        const provider = contract.runner?.provider ?? null;
        const latestBlock = provider ? await provider.getBlockNumber() : 0;
        const fromBlock = Math.max(0, latestBlock - 10000);
        const eventErrors = [];

        for (const eventName of EVENT_TYPES) {
          const filterFactory = contract.filters?.[eventName];
          const filter = filterFactory ? filterFactory() : null;
          if (!filter) continue;

          try {
            let logs = [];
            if (provider) {
              try {
                logs = await contract.queryFilter(filter, fromBlock, latestBlock);
              } catch (rangeError) {
                // Fallback for providers that reject ranged queryFilter in some local chains.
                logs = await contract.queryFilter(filter);
              }
            } else {
              logs = await contract.queryFilter(filter);
            }

            const mapped = logs.map((log) => ({
              event: eventName,
              reportId: toDisplayValue(log.args?.reportId),
              fileId: toDisplayValue(log.args?.fileId),
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
            }));
            allEvents.push(...mapped);
          } catch (eventError) {
            console.warn(`Failed to load event ${eventName}:`, eventError);
            eventErrors.push(`${eventName}: ${eventError?.shortMessage || eventError?.message || 'unknown error'}`);
          }
        }

        allEvents.sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0));
        setEvents(allEvents.slice(0, 50));
        setLastUpdated(new Date());
        setErrorDetails('');
        if (allEvents.length === 0 && eventErrors.length === EVENT_TYPES.length) {
          setError('Failed to load blockchain events. Check Hardhat node and contract deployment.');
          setErrorDetails(eventErrors.join(' | '));
        } else {
          setError('');
          setErrorDetails('');
        }
      } catch (err) {
        console.error('Error loading blockchain events:', err);
        setError('Failed to load blockchain events');
        setErrorDetails(err?.shortMessage || err?.message || '');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [contract]
  );

  useEffect(() => {
    if (!contract) return undefined;
    loadEvents();
    return undefined;
  }, [contract, loadEvents]);

  useEffect(() => {
    if (!contract) return undefined;

    const intervalId = setInterval(() => {
      loadEvents({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [contract, loadEvents]);

  useEffect(() => {
    if (!contract) return undefined;

    const handlers = [];

    for (const eventName of EVENT_TYPES) {
      const handler = () => loadEvents({ silent: true });
      handlers.push({ eventName, handler });
      try {
        contract.on(eventName, handler);
      } catch (subscribeError) {
        console.warn(`Failed to subscribe ${eventName}:`, subscribeError);
      }
    }

    return () => {
      for (const { eventName, handler } of handlers) {
        try {
          contract.off(eventName, handler);
        } catch (unsubscribeError) {
          console.warn(`Failed to unsubscribe ${eventName}:`, unsubscribeError);
        }
      }
    };
  }, [contract, loadEvents]);

  if (!supported) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-slate-900">Blockchain Activity</h3>
        <p className="mt-2 text-sm text-slate-600">Connect your wallet to view recent blockchain events.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Blockchain Activity</h3>
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
            onClick={() => loadEvents()}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <p>{error}</p>
          {errorDetails && (
            <p className="mt-2 break-all text-xs text-rose-600">{errorDetails}</p>
          )}
        </div>
      )}

      {!loading && !error && (
        <ul className="mt-4 space-y-3">
          {events.length === 0 && (
            <li className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No recent events found.
            </li>
          )}
          {events.map((evt, idx) => (
            <li key={`${evt.event}-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">{evt.event}</span>
                <span className="text-xs font-medium text-slate-500">Block #{evt.blockNumber}</span>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <span className="font-medium text-slate-700">Tx:</span>
                  <code className="mt-1 block truncate rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
                    {evt.transactionHash}
                  </code>
                </div>
                {evt.reportId && (
                  <div>
                    <span className="font-medium text-slate-700">Report:</span>
                    <span className="mt-1 block break-all text-sm text-slate-600">{evt.reportId}</span>
                  </div>
                )}
                {evt.fileId && (
                  <div>
                    <span className="font-medium text-slate-700">File:</span>
                    <span className="mt-1 block break-all text-sm text-slate-600">{evt.fileId}</span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
