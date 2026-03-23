const HARDHAT_CHAIN_ID = '0x7a69'; // 31337 in hex

export async function switchToHardhat() {
  if (!window.ethereum) {
    return { success: false, message: 'MetaMask not installed' };
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: HARDHAT_CHAIN_ID }],
    });
    return { success: true };
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: HARDHAT_CHAIN_ID,
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
        return { success: true };
      } catch (addError) {
        console.error('Failed to add network', addError);
        return { success: false, message: 'Failed to add Hardhat network to MetaMask.' };
      }
    } else {
      console.error('Failed to switch network', switchError);
      return {
        success: false,
        message: `Failed to switch network: ${switchError.message || switchError}`,
      };
    }
  }
}

export function isCorrectNetwork(chainId) {
  return chainId === HARDHAT_CHAIN_ID;
}
