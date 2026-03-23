import { useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import FileManagement from '../components/FileManagement';
import AnalyticsDashboard from './AnalyticsDashboard';

export default function AdminDashboard() {
  const { contract } = useBlockchain();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeSection, setActiveSection] = useState('register');

  const registerUser = async (roleType) => {
    if (!address) {
      setMessage('Please enter an address');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      let tx;
      switch (roleType) {
        case 'INSPECTOR':
          tx = await contract.registerInspector(address);
          break;
        case 'APPROVER':
          tx = await contract.registerApprover(address);
          break;
        case 'AUDITOR':
          tx = await contract.registerAuditor(address);
          break;
        default:
          throw new Error('Invalid role type');
      }

      setMessage('⏳ Transaction submitted. Waiting for confirmation...');
      await tx.wait();
      setMessage(`✅ Successfully registered ${address} as ${roleType}`);
      setAddress('');
    } catch (error) {
      console.error('Error registering user:', error);
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
            <h1 className="text-xl font-semibold text-slate-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Register users, manage files, and view analytics.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSection('register')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeSection === 'register'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              User Roles
            </button>
            <button
              onClick={() => setActiveSection('files')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeSection === 'files'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              File Management
            </button>
            <button
              onClick={() => setActiveSection('analytics')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeSection === 'analytics'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
      </div>

      {activeSection === 'register' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Register Team Members</h2>
          <p className="mt-1 text-sm text-slate-500">Grant access by assigning roles to Ethereum addresses.</p>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter wallet address (0x...)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => registerUser('INSPECTOR')}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Inspector
                </button>
                <button
                  onClick={() => registerUser('APPROVER')}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Approver
                </button>
                <button
                  onClick={() => registerUser('AUDITOR')}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Auditor
                </button>
              </div>

              {message && (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  {message}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-sm font-semibold text-slate-800">Quick tips</h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>1. Copy the wallet address from MetaMask.</li>
                <li>2. Paste it above and select the role.</li>
                <li>3. Confirm the transaction in MetaMask.</li>
                <li>4. User must reconnect to see their role.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'files' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <FileManagement />
        </div>
      )}

      {activeSection === 'analytics' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <AnalyticsDashboard />
        </div>
      )}
    </div>
  );
}
