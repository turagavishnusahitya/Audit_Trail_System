import { useState } from 'react';
import { Wifi, Repeat } from 'lucide-react';

export default function NetworkTest() {
  const [result, setResult] = useState('Click "Check Network" to start');

  const checkNetwork = async () => {
    if (!window.ethereum) {
      setResult('❌ MetaMask not installed!');
      return;
    }

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const chainIdDecimal = parseInt(chainId, 16);

      setResult(
        `Current Network:\nChain ID (hex): ${chainId}\nChain ID (decimal): ${chainIdDecimal}\n\n${
          chainIdDecimal === 31337 ? '✅ CORRECT! You are on Hardhat Local' : '❌ WRONG! Need Chain ID 31337'
        }`
      );
    } catch (error) {
      setResult('❌ Error: ' + error.message);
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) {
      setResult('❌ MetaMask not installed!');
      return;
    }

    try {
      setResult('⏳ Switching network...');
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x7a69',
            chainName: 'Hardhat Local',
            rpcUrls: ['http://127.0.0.1:8545'],
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
          },
        ],
      });
      setResult('✅ Network added/switched successfully! Checking network...');
      setTimeout(checkNetwork, 1000);
    } catch (error) {
      setResult(
        `❌ Error: ${error.message}\n\nManual steps:\n1. Open MetaMask\n2. Delete network with Chain ID 1329\n3. This will add Chain ID 31337`
      );
    }
  };

  return (
    <div className="rounded-3xl bg-white p-8 shadow-elevated">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Wifi className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">MetaMask Network Test</h2>
            <p className="text-sm text-slate-500">Validate that your wallet is connected to the correct Hardhat network.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={checkNetwork}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <Wifi className="h-4 w-4" />
            Check Network
          </button>
          <button
            onClick={switchNetwork}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Repeat className="h-4 w-4" />
            Switch to Hardhat
          </button>
        </div>

        <pre className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-mono text-slate-700 whitespace-pre-wrap">
          {result}
        </pre>
      </div>
    </div>
  );
}
