import { useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import { api } from '../utils/api';
import { hashToBytes32, getStatusName } from '../utils/helpers';
import AnalyticsDashboard from './AnalyticsDashboard';
import InspectionTimeline from '../components/InspectionTimeline';

export default function AuditorDashboard() {
  const { contract } = useBlockchain();
  const [reportId, setReportId] = useState('');
  const [inspection, setInspection] = useState(null);
  const [blockchainData, setBlockchainData] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [view, setView] = useState('verify');

  const verifyInspection = async () => {
    if (!reportId) {
      setMessage('Please enter a report ID');
      return;
    }

    setLoading(true);
    setMessage('');
    setInspection(null);
    setBlockchainData(null);
    setVerificationResult(null);

    try {
      setMessage('🔍 Fetching inspection data...');

      const backendData = await api.getInspection(reportId);
      setInspection(backendData);

      const blockchainInspection = await contract.getInspection(reportId);
      const blockchainHash = blockchainInspection.dataHash;

      setBlockchainData({
        status: getStatusName(Number(blockchainInspection.status)),
        inspector: blockchainInspection.inspector,
        timestamp: new Date(Number(blockchainInspection.timestamp) * 1000).toLocaleString(),
        storedHash: blockchainHash,
      });

      setMessage('🔍 Recalculating hash...');
      const verifyResponse = await api.verifyInspection(reportId);
      const calculatedHash = hashToBytes32(verifyResponse.calculatedHash);

      const isAuthentic = calculatedHash.toLowerCase() === blockchainHash.toLowerCase();

      setVerificationResult({
        isAuthentic,
        calculatedHash,
        blockchainHash,
      });

      setMessage(
        isAuthentic
          ? '✅ VERIFICATION PASSED: Data is authentic and untampered'
          : '❌ VERIFICATION FAILED: Data has been tampered with!'
      );

      try {
        await api.addInspectionEvent(reportId, {
          type: 'VERIFIED',
          actor: contract.signer ? await contract.signer.getAddress() : undefined,
          details: isAuthentic ? 'Inspection verified successfully' : 'Inspection verification failed',
          status: blockchainData?.status || null,
        });
      } catch (timelineError) {
        console.warn('Timeline update failed:', timelineError);
      }
    } catch (error) {
      console.error('Error verifying inspection:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Auditor Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Verify inspection integrity and review analytics.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setView('verify')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                view === 'verify'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Verify
            </button>
            <button
              type="button"
              onClick={() => setView('analytics')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                view === 'analytics'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </div>

      {view === 'analytics' ? (
        <AnalyticsDashboard />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              type="text"
              placeholder="Enter Report ID"
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            <button
              onClick={verifyInspection}
              disabled={loading}
              className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Verify Inspection
            </button>
          </div>

          {inspection && blockchainData && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Inspection Details</h2>
                  <p className="mt-1 text-sm text-slate-500">Compare backend data with the blockchain record.</p>
                </div>
                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    blockchainData.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : blockchainData.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {blockchainData.status}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Project ID</p>
                  <p className="text-sm text-slate-600">{inspection.projectId}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Location</p>
                  <p className="text-sm text-slate-600">{inspection.location}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Strength</p>
                  <p className="text-sm text-slate-600">{inspection.qualityParameters.strength}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Finish</p>
                  <p className="text-sm text-slate-600">{inspection.qualityParameters.finish}</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm font-semibold text-slate-700">Remarks</p>
                  <p className="text-sm text-slate-600">{inspection.remarks}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Inspector</p>
                  <p className="text-sm text-slate-600">{blockchainData.inspector}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Created</p>
                  <p className="text-sm text-slate-600">{blockchainData.timestamp}</p>
                </div>
              </div>

              <div className="mt-6">
                <InspectionTimeline reportId={reportId} />
              </div>
            </div>
          )}

          {verificationResult && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-slate-900">🔍 Verification Result</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Blockchain Hash</p>
                  <code className="block break-words text-xs text-slate-600">{verificationResult.blockchainHash}</code>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Calculated Hash</p>
                  <code className="block break-words text-xs text-slate-600">{verificationResult.calculatedHash}</code>
                </div>
              </div>

              <div
                className={`mt-6 rounded-2xl p-4 text-sm font-semibold ${
                  verificationResult.isAuthentic
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {verificationResult.isAuthentic ? (
                  <>
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-xl">✅</span>
                      <span>AUTHENTIC</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">The inspection data matches the blockchain record. No tampering detected.</p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 font-semibold">
                      <span className="text-xl">❌</span>
                      <span>TAMPERED</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">The inspection data does NOT match the blockchain record. Data may have been modified after blockchain storage.</p>
                  </>
                )}
              </div>
            </div>
          )}

          {message && <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{message}</div>}
        </div>
      )}
    </div>
  );
}
