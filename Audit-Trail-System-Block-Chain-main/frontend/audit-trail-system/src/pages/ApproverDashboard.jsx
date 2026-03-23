import { useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import { api } from '../utils/api';
import { hashToBytes32, getStatusName } from '../utils/helpers';
import InspectionTimeline from '../components/InspectionTimeline';

export default function ApproverDashboard() {
  const { contract } = useBlockchain();
  const [reportId, setReportId] = useState('');
  const [inspection, setInspection] = useState(null);
  const [blockchainData, setBlockchainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchInspection = async () => {
    if (!reportId) {
      setMessage('Please enter a report ID');
      return;
    }

    setLoading(true);
    setMessage('');
    setInspection(null);
    setBlockchainData(null);

    try {
      const backendData = await api.getInspection(reportId);
      setInspection(backendData);

      const blockchainInspection = await contract.getInspection(reportId);
      setBlockchainData({
        status: getStatusName(Number(blockchainInspection.status)),
        inspector: blockchainInspection.inspector,
        timestamp: new Date(Number(blockchainInspection.timestamp) * 1000).toLocaleString(),
      });

      setMessage('✅ Inspection loaded');
    } catch (error) {
      console.error('Error fetching inspection:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const approveInspection = async () => {
    setLoading(true);
    setMessage('');

    try {
      const verifyResponse = await api.verifyInspection(reportId);
      const approvalHash = hashToBytes32(verifyResponse.calculatedHash);

      setMessage('⏳ Approving inspection...');

      const tx = await contract.approveInspection(reportId, approvalHash);
      const receipt = await tx.wait();

      setMessage('✅ Inspection approved! It is now immutable.');

      try {
        await api.addInspectionEvent(reportId, {
          type: 'APPROVED',
          txHash: receipt.hash,
          actor: contract.signer ? await contract.signer.getAddress() : undefined,
          details: 'Inspection approved on blockchain',
          status: 'APPROVED',
        });
      } catch (timelineError) {
        console.warn('Timeline update failed:', timelineError);
      }

      fetchInspection();
    } catch (error) {
      console.error('Error approving inspection:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const rejectInspection = async (reason) => {
    if (!reason) return;

    setLoading(true);
    setMessage('');

    try {
      setMessage('⏳ Rejecting inspection...');

      const tx = await contract.rejectInspection(reportId, reason);
      const receipt = await tx.wait();

      setMessage('✅ Inspection rejected');

      try {
        await api.addInspectionEvent(reportId, {
          type: 'REJECTED',
          txHash: receipt.hash,
          actor: contract.signer ? await contract.signer.getAddress() : undefined,
          details: `Inspection rejected: ${reason}`,
          status: 'REJECTED',
        });
      } catch (timelineError) {
        console.warn('Timeline update failed:', timelineError);
      }

      fetchInspection();
    } catch (error) {
      console.error('Error rejecting inspection:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
      setShowRejectInput(false);
      setRejectionReason('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Approver Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Review inspections and approve or reject them.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            Role: Approver
          </div>
        </div>
      </div>

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
            onClick={fetchInspection}
            disabled={loading}
            className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Load Inspection
          </button>
        </div>

        {inspection && blockchainData && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Inspection Details</h2>
                <p className="mt-1 text-sm text-slate-500">Review the information and decide whether to approve.</p>
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

            {blockchainData.status === 'SUBMITTED' && (
              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={approveInspection}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    ❌ Reject
                  </button>
                </div>

                {showRejectInput && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-rose-700">Rejection reason</p>
                        <p className="mt-1 text-sm text-rose-600">Provide a short explanation for the rejection.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRejectInput(false);
                          setRejectionReason('');
                        }}
                        className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Cancel
                      </button>
                    </div>

                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="mt-3 w-full resize-none rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                      placeholder="Enter reason for rejection (required)"
                    />

                    <button
                      type="button"
                      onClick={() => rejectInspection(rejectionReason)}
                      disabled={loading || !rejectionReason.trim()}
                      className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Confirm rejection
                    </button>
                  </div>
                )}
              </div>
            )}

            {blockchainData.status === 'APPROVED' && (
              <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                🔒 This inspection is approved and immutable. No changes are allowed.
              </div>
            )}

            <div className="mt-6">
              <InspectionTimeline reportId={reportId} />
            </div>
          </div>
        )}

        {message && <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{message}</div>}
      </div>
    </div>
  );
}
