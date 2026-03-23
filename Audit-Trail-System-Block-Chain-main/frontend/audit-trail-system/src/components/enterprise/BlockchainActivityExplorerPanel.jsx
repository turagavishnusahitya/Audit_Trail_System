import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBlockchain } from '../../context/BlockchainContext';

const EVENT_DEFINITIONS = [
  { name: 'InspectionCreated', action: 'Create' },
  { name: 'InspectionSubmitted', action: 'Submit' },
  { name: 'InspectionApproved', action: 'Approve' },
  { name: 'InspectionRejected', action: 'Reject' },
  { name: 'FileUploaded', action: 'File Upload' },
  { name: 'FileVerified', action: 'Verify' },
  { name: 'FileTamperingDetected', action: 'Tamper Alert' },
];

const ROLE_NAMES = ['NONE', 'ADMIN', 'INSPECTOR', 'APPROVER', 'AUDITOR'];

function safeString(value) {
  return value ? String(value) : '';
}

export default function BlockchainActivityExplorerPanel({ onRecordsChange }) {
  const { contract, provider } = useBlockchain();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supported = useMemo(() => !!contract && !!provider, [contract, provider]);

  const loadActivity = useCallback(async () => {
    if (!contract || !provider) return;

    setLoading(true);
    setError('');

    try {
      const eventRecords = [];
      const blockCache = new Map();
      const txCache = new Map();
      const roleCache = new Map();

      for (const definition of EVENT_DEFINITIONS) {
        const filterFactory = contract.filters?.[definition.name];
        if (!filterFactory) continue;

        const logs = await contract.queryFilter(filterFactory(), -10000);
        for (const log of logs) {
          eventRecords.push({
            definition,
            log,
          });
        }
      }

      const normalized = await Promise.all(
        eventRecords.map(async ({ definition, log }) => {
          let block = blockCache.get(log.blockNumber);
          if (!block) {
            block = await provider.getBlock(log.blockNumber);
            blockCache.set(log.blockNumber, block);
          }

          let tx = txCache.get(log.transactionHash);
          if (!tx) {
            tx = await provider.getTransaction(log.transactionHash);
            txCache.set(log.transactionHash, tx);
          }

          const actorFromArgs =
            safeString(log.args?.inspector) ||
            safeString(log.args?.approver) ||
            safeString(log.args?.uploadedBy);
          const walletAddress = actorFromArgs || safeString(tx?.from);

          let role = 'UNKNOWN';
          if (walletAddress) {
            if (roleCache.has(walletAddress)) {
              role = roleCache.get(walletAddress);
            } else {
              try {
                const roleValue = await contract.getRole(walletAddress);
                role = ROLE_NAMES[Number(roleValue)] || 'UNKNOWN';
              } catch {
                role = 'UNKNOWN';
              }
              roleCache.set(walletAddress, role);
            }
          }

          const receipt = await provider.getTransactionReceipt(log.transactionHash);
          const gasUsed = receipt?.gasUsed ? Number(receipt.gasUsed) : 0;

          return {
            event: definition.name,
            action: definition.action,
            transactionHash: log.transactionHash,
            walletAddress,
            role,
            timestamp: block?.timestamp ? new Date(Number(block.timestamp) * 1000).toISOString() : null,
            blockNumber: log.blockNumber,
            reportId: safeString(log.args?.reportId) || safeString(log.args?.fileId),
            gasUsed,
          };
        })
      );

      normalized.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
      const top = normalized.slice(0, 50);
      setRecords(top);
      if (onRecordsChange) {
        onRecordsChange(top);
      }
    } catch (err) {
      console.error('Blockchain explorer load failed:', err);
      setError('Failed to load blockchain activity');
    } finally {
      setLoading(false);
    }
  }, [contract, provider, onRecordsChange]);

  useEffect(() => {
    if (!supported) return undefined;
    loadActivity();
    return undefined;
  }, [supported, loadActivity]);

  useEffect(() => {
    if (!supported) return undefined;
    const intervalId = setInterval(loadActivity, 10000);
    return () => clearInterval(intervalId);
  }, [supported, loadActivity]);

  if (!supported) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-lg font-semibold text-slate-900">Blockchain Activity Explorer</h2>
        <p className="mt-2 text-sm text-slate-500">Connect wallet to load on-chain activity.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Blockchain Activity Explorer</h2>
          <p className="mt-1 text-sm text-slate-500">
            Transaction hash, wallet, role, action, and timestamp from contract events.
          </p>
        </div>
        <button
          type="button"
          onClick={loadActivity}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="mt-4 text-sm text-slate-500">Loading blockchain records...</p>}
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {!loading && !error && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Wallet</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Tx Hash</th>
                <th className="px-3 py-2">Gas Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
                    No blockchain events yet.
                  </td>
                </tr>
              )}
              {records.map((record) => (
                <tr key={`${record.transactionHash}-${record.event}`}>
                  <td className="px-3 py-3">{record.action}</td>
                  <td className="px-3 py-3 break-all">{record.walletAddress || '-'}</td>
                  <td className="px-3 py-3">{record.role}</td>
                  <td className="px-3 py-3">{record.timestamp ? new Date(record.timestamp).toLocaleString() : '-'}</td>
                  <td className="px-3 py-3 break-all text-xs font-mono">{record.transactionHash}</td>
                  <td className="px-3 py-3">{record.gasUsed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
