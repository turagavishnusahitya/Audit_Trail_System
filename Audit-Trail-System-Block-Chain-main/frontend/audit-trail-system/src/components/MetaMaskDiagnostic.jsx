import { useState } from 'react';
import { Cpu, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function MetaMaskDiagnostic() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [error, setError] = useState('');

  const checkAccounts = async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed!');
      return;
    }

    try {
      const allAccounts = await window.ethereum.request({ method: 'eth_accounts' });
      setAccounts(allAccounts);
      if (allAccounts.length > 0) setSelectedAccount(allAccounts[0]);
    } catch (err) {
      setError(err.message);
    }
  };

  const requestAccounts = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccounts(accounts);
      setSelectedAccount(accounts[0]);
    } catch (err) {
      setError(err.message);
    }
  };

  const isAdmin = selectedAccount.toLowerCase() === '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
  const isWrong = selectedAccount.toLowerCase() === '0x21fedaf935dec152333f1ed125198a7045ac754b';

  return (
    <div className="rounded-3xl bg-white p-8 shadow-elevated">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">MetaMask Diagnostic</h2>
            <p className="mt-1 text-sm text-slate-500">
              Quick tools to inspect the connected MetaMask accounts and ensure you are on the correct network.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={checkAccounts}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <ShieldCheck className="h-4 w-4" />
            Check Accounts
          </button>
          <button
            onClick={requestAccounts}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Request Access
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        {selectedAccount && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Selected account</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {isAdmin ? 'Admin' : isWrong ? 'Wrong' : 'User'}
              </span>
            </div>
            <p className="mt-2 font-mono text-sm text-slate-700">{selectedAccount}</p>

            {isAdmin ? (
              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                ✅ This looks like the expected admin account.
              </div>
            ) : isWrong ? (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                ❌ This account is not a Hardhat test account.
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-700">
                ⚠️ This is not the admin account (Account #0).
              </div>
            )}
          </div>
        )}

        {accounts.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-800">Connected Accounts ({accounts.length})</h3>
            <div className="mt-3 space-y-3">
              {accounts.map((account, index) => (
                <div
                  key={index}
                  className={`rounded-xl border px-4 py-3 ${
                    account === selectedAccount
                      ? 'border-brand-200 bg-brand-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <p className="font-mono text-sm text-slate-700">{account}</p>
                  {account.toLowerCase() === '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' && (
                    <p className="mt-1 text-xs font-semibold text-emerald-700">✅ Admin Account (Account #0)</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-semibold text-amber-700">Tip</h3>
              <p className="mt-1 text-sm text-amber-700">
                If you see an unexpected account, remove it from MetaMask or switch to the correct one before reconnecting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
