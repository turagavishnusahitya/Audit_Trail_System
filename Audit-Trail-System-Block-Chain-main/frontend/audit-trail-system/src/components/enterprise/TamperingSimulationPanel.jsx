import { useState } from 'react';
import { api } from '../../utils/api';

export default function TamperingSimulationPanel({ reportId, onSimulationComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const simulateTamper = async () => {
    if (!reportId) {
      setError('Enter a report ID before simulating tampering.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.simulateInspectionTamper(reportId, {
        actor: 'enterprise-dashboard',
        mutation: 'append_remarks',
      });
      setResult(response);
      if (onSimulationComplete) onSimulationComplete(response);
    } catch (err) {
      console.error('Tamper simulation failed:', err);
      setError(err.message || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Tampering Simulation</h2>
      <p className="mt-1 text-sm text-slate-500">
        Controlled mutation for demonstration. Existing APIs remain unchanged.
      </p>

      <button
        type="button"
        onClick={simulateTamper}
        disabled={loading}
        className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Simulating...' : 'Simulate Tampering'}
      </button>

      {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {result && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">HASH MISMATCH DETECTED</p>
          <p className="mt-1 break-words">Previous Hash: {result.previousHash}</p>
          <p className="mt-1 break-words">New Hash: {result.newHash}</p>
          <p className="mt-1 text-xs">Mutation: {result.mutation}</p>
        </div>
      )}
    </section>
  );
}
