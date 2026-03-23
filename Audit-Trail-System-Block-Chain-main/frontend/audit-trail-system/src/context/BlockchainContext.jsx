import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import contractAddress from '../contracts/contract-address.json';
import contractABI from '../contracts/AuditTrail.json';

const BlockchainContext = createContext();

export const useBlockchain = () => {
  const context = useContext(BlockchainContext);
  if (!context) {
    throw new Error('useBlockchain must be used within BlockchainProvider');
  }
  return context;
};

export const BlockchainProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [role, setRole] = useState('NONE');
  const [chainId, setChainId] = useState(null);

  // Role mapping
  const ROLES = {
    0: 'NONE',
    1: 'ADMIN',
    2: 'INSPECTOR',
    3: 'APPROVER',
    4: 'AUDITOR'
  };

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      return { success: false, message: 'Please install MetaMask.' };
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      // Create provider using BrowserProvider (ethers v6)
      const browserProvider = new BrowserProvider(window.ethereum);
      const network = await browserProvider.getNetwork();
      
      // Convert chainId to number (ethers v6 returns BigInt)
      const chainIdNum = Number(network.chainId.toString());
      
      console.log('Network detected:', network);
      console.log('Chain ID:', chainIdNum);
      
      // Check if connected to Hardhat network (chainId 31337)
      if (chainIdNum !== 31337) {
        return {
          success: false,
          message: `Wrong network. Current Chain ID: ${chainIdNum}. Required Chain ID: 31337. Please switch MetaMask to "Hardhat Local".`,
        };
      }

      // Get signer
      const userSigner = await browserProvider.getSigner();

      // Create contract instance
      const auditContract = new Contract(
        contractAddress.contractAddress,
        contractABI.abi,
        userSigner
      );

      // Get user role from contract
      const userRole = await auditContract.getRole(accounts[0]);

      setAccount(accounts[0]);
      setProvider(browserProvider);
      setSigner(userSigner);
      setContract(auditContract);
      setRole(ROLES[Number(userRole)]);
      setChainId(chainIdNum);

      console.log('✅ Connected successfully!');
      console.log('Account:', accounts[0]);
      console.log('Role:', ROLES[Number(userRole)]);

      return { success: true };
    } catch (error) {
      console.error('Error connecting wallet:', error);
      if (error.code === 4001) {
        return { success: false, message: 'Connection rejected by user.' };
      }
      return { success: false, message: 'Failed to connect: ' + error.message };
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setRole('NONE');
    setChainId(null);
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          // Reconnect with new account
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const value = {
    account,
    provider,
    signer,
    contract,
    role,
    chainId,
    connectWallet,
    disconnectWallet,
    ROLES
  };

  return (
    <BlockchainContext.Provider value={value}>
      {children}
    </BlockchainContext.Provider>
  );
};
