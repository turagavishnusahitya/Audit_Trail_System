import { useState } from 'react';
import { useBlockchain } from '../../context/BlockchainContext';
import { api } from '../../utils/api';
import { hashToBytes32 } from '../../utils/helpers';

export default function LiveIntegrityVerificationPanel({ reportId, onVerificationComplete }) {
  const { contract } = useBlockchain();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const runVerification = async () => {
    if (!reportId) {
      setError('Enter a report ID to run verification.');
      return;
    }
    if (!contract) {
      setError('Connect wallet to access blockchain hash.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [integrity, backendInspection, onChainInspection] = await Promise.all([
        api.getInspectionIntegrity(reportId),
        api.getInspection(reportId),
        contract.getInspection(reportId),
      ]);

      const blockchainHash = onChainInspection.dataHash;
      const recalculatedHash = hashToBytes32(integrity.recalculatedHash);
      const isValid = blockchainHash.toLowerCase() === recalculatedHash.toLowerCase();

      const verification = {
        isValid,
        blockchainHash,
        recalculatedHash,
        status: integrity.status,
        dataSizeBytes: integrity.dataSizeBytes,
        inspectedAt: integrity.inspectedAt,
        timeline: backendInspection.timeline || [],
      };

      setResult(verification);

      if (onVerificationComplete) {
        onVerificationComplete({
          ...verification,
          inspection: backendInspection,
        });
      }
    } catch (err) {
      console.error('Live verification failed:', err);
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Live Integrity Verification</h2>
          <p className="mt-1 text-sm text-slate-500">
            Recompute hash from MongoDB data and compare with immutable blockchain hash.
          </p>
        </div>
        <button
          type="button"
          onClick={runVerification}
          disabled={loading}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Verifying...' : 'Run Verification'}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {result && (
        <div className="mt-5 space-y-4">
          <div
            className={`rounded-xl border p-4 text-sm font-semibold ${
              result.isValid
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {result.isValid ? 'VALID - HASH MATCH' : 'TAMPERED - HASH MISMATCH DETECTED'}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blockchain Hash</p>
              <code className="mt-2 block break-words text-xs text-slate-700">{result.blockchainHash}</code>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                result.isValid ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recalculated MongoDB Hash</p>
              <code className="mt-2 block break-words text-xs text-slate-700">{result.recalculatedHash}</code>
            </div>
          </div>

          <div className="grid gap-3 text-xs text-slate-500 md:grid-cols-3">
            <p>Status: {result.status}</p>
            <p>Data size: {result.dataSizeBytes} bytes</p>
            <p>Checked at: {new Date(result.inspectedAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </section>
  );
}
