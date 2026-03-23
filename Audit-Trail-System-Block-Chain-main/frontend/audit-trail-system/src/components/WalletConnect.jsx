import { useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import { switchToHardhat } from '../utils/switchNetwork';
import { ShieldCheck, Link2, AlertTriangle } from 'lucide-react';

function WalletConnect() {
  const { connectWallet } = useBlockchain();
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info');

  const handleConnect = async () => {
    setStatusMessage('⏳ Ensuring wallet is on Hardhat network...');
    setStatusType('info');

    const result = await switchToHardhat();
    if (!result.success) {
      setStatusMessage(`❌ ${result.message}`);
      setStatusType('error');
      return;
    }

    setStatusMessage('✅ Network ready, connecting wallet...');
    setStatusType('success');

    const connectResult = await connectWallet();
    if (connectResult && !connectResult.success) {
      setStatusMessage(`❌ ${connectResult.message}`);
      setStatusType('error');
      return;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl bg-white p-10 shadow-elevated">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 text-white shadow-soft">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Blockchain Audit Trail</h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-600">
            Connect your MetaMask wallet to start tracking inspection data on a secure blockchain-backed audit trail.
          </p>

          <button
            onClick={handleConnect}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Link2 className="h-4 w-4" />
            Connect MetaMask
          </button>

          {statusMessage && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
                statusType === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : statusType === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {statusMessage}
            </div>
          )}

          <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left">
            <p className="text-sm font-semibold text-slate-700">Network requirements</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600">•</span>
                Hardhat Local (Chain ID 31337)
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600">•</span>
                RPC: <span className="font-mono">http://127.0.0.1:8545</span>
              </li>
            </ul>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-orange-50 p-3">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <p className="text-xs text-orange-700">
                Make sure your local Hardhat node is running before connecting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WalletConnect;
