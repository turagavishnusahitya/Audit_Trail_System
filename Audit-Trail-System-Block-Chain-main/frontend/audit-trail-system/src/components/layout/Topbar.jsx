import { Bell, LogOut, Cpu, Wifi } from 'lucide-react';
import { useBlockchain } from '../../context/BlockchainContext';
import { formatAddress } from '../../utils/helpers';

export default function Topbar({ onToggleMobileMenu }) {
  const { account, chainId, disconnectWallet } = useBlockchain();

  const networkLabel = chainId === 31337 ? 'Hardhat Local' : chainId ? `Chain ${chainId}` : 'Disconnected';
  const networkColor = chainId === 31337 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 shadow-[0_6px_22px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="xl:hidden inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Toggle navigation"
        >
          <span className="sr-only">Toggle menu</span>
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1 shadow-sm ${networkColor}`}> 
          <Wifi className="h-4 w-4" />
          <span className="text-xs font-medium">{networkLabel}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 rounded-full px-3 py-1 bg-slate-50 text-slate-700">
          <Cpu className="h-4 w-4" />
          <span className="text-xs font-medium">{account ? formatAddress(account) : 'No wallet connected'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
        {account && (
          <button
            type="button"
            onClick={disconnectWallet}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
