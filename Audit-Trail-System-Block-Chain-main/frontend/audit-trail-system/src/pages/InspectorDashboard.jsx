import { useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import { api } from '../utils/api';
import { hashToBytes32 } from '../utils/helpers';

export default function InspectorDashboard() {
  const { contract, account } = useBlockchain();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    location: '',
    strength: '',
    finish: '',
    remarks: '',
  });

  const [createdReportId, setCreatedReportId] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const createInspection = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      setMessage('📝 Saving inspection to database...');

      const inspectionData = {
        projectId: formData.projectId,
        location: formData.location,
        qualityParameters: {
          strength: formData.strength,
          finish: formData.finish,
        },
        remarks: formData.remarks,
        images: [],
        inspector: account,
      };

      const backendResponse = await api.createInspection(inspectionData);
      const { reportId, dataHash } = backendResponse;

      setMessage('⏳ Storing hash on blockchain...');

      const bytes32Hash = hashToBytes32(dataHash);
      const tx = await contract.createInspection(reportId, bytes32Hash);

      setMessage('⏳ Waiting for blockchain confirmation...');
      const receipt = await tx.wait();

      setMessage(`✅ Inspection created successfully! Report ID: ${reportId}`);
      setCreatedReportId(reportId);

      try {
        await api.addInspectionEvent(reportId, {
          type: 'CREATED',
          txHash: receipt.hash,
          actor: account,
          details: 'Inspection created and hash stored on blockchain',
          status: 'CREATED',
        });
      } catch (timelineError) {
        console.warn('Timeline update failed:', timelineError);
      }

      setFormData({
        projectId: '',
        location: '',
        strength: '',
        finish: '',
        remarks: '',
      });
    } catch (error) {
      console.error('Error creating inspection:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitInspection = async () => {
    if (!createdReportId) {
      setMessage('Please create an inspection first');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      setMessage('⏳ Submitting inspection for approval...');

      const tx = await contract.submitInspection(createdReportId);
      const receipt = await tx.wait();

      setMessage(`✅ Inspection ${createdReportId} submitted for approval!`);

      try {
        await api.addInspectionEvent(createdReportId, {
          type: 'SUBMITTED',
          txHash: receipt.hash,
          actor: account,
          details: 'Inspection submitted for approval',
          status: 'SUBMITTED',
        });
      } catch (timelineError) {
        console.warn('Timeline update failed:', timelineError);
      }

      setCreatedReportId('');
    } catch (error) {
      console.error('Error submitting inspection:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Inspector Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Create and submit quality inspections.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            Role: Inspector
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <form onSubmit={createInspection} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Project ID</label>
              <input
                type="text"
                name="projectId"
                value={formData.projectId}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Strength</label>
              <select
                name="strength"
                value={formData.strength}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Select...</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Finish</label>
              <select
                name="finish"
                value={formData.finish}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              >
                <option value="">Select...</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              required
              disabled={loading}
              rows="4"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Create Inspection
            </button>

            {createdReportId && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p>
                  <span className="font-semibold">Report ID:</span> {createdReportId}
                </p>
                <button
                  type="button"
                  onClick={submitInspection}
                  disabled={loading}
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Submit for Approval
                </button>
              </div>
            )}
          </div>

          {message && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{message}</div>
          )}
        </form>
      </div>
    </div>
  );
}
