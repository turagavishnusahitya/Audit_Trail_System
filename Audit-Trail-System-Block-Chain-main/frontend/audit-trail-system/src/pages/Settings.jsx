import { useBlockchain } from '../context/BlockchainContext';
import { formatAddress } from '../utils/helpers';

export default function Settings() {
  const { account, role, chainId, disconnectWallet } = useBlockchain();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-soft">
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your wallet and network preferences.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Connected Wallet</p>
            <p className="mt-2 text-sm font-medium text-slate-700">{account ? formatAddress(account) : 'Not connected'}</p>
            <p className="mt-1 text-xs text-slate-500">Role: {role}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Network</p>
            <p className="mt-2 text-sm font-medium text-slate-700">{chainId ? `Chain ID ${chainId}` : 'Disconnected'}</p>
            <p className="mt-1 text-xs text-slate-500">Recommended: Hardhat Local (31337)</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={disconnectWallet}
            className="inline-flex items-center justify-center rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-600"
          >
            Disconnect Wallet
          </button>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Help</p>
            <p className="mt-1 text-sm text-slate-600">
              If you need to reset your connection, disconnect and reconnect your wallet.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/70 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Tips</h2>
        <ul className="mt-3 space-y-3 text-sm text-slate-600">
          <li>• Use the hardhat local network (chain ID 31337) with MetaMask.</li>
          <li>• If you change accounts, reconnect to refresh roles.</li>
          <li>• For consistent results, keep your browser extension unlocked.</li>
        </ul>
      </div>
    </div>
  );
}
