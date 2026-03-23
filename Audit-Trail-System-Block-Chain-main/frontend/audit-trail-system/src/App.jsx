import { useState } from 'react';
import { BlockchainProvider, useBlockchain } from './context/BlockchainContext';
import WalletConnect from './components/WalletConnect';
import NetworkTest from './components/NetworkTest';
import MetaMaskDiagnostic from './components/MetaMaskDiagnostic';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './pages/AdminDashboard';
import InspectorDashboard from './pages/InspectorDashboard';
import ApproverDashboard from './pages/ApproverDashboard';
import AuditorDashboard from './pages/AuditorDashboard';
import FileManagement from './components/FileManagement';
import BlockchainActivityPanel from './components/BlockchainActivityPanel';
import AuditLogs from './pages/AuditLogs';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import Settings from './pages/Settings';
import EnterpriseDashboard from './pages/EnterpriseDashboard';
import AssistDock from './components/widgets/AssistDock';

function AppContent() {
  const { account, role } = useBlockchain();
  const [showTest, setShowTest] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  if (!account) {
    return (
      <>
        <div className="fixed right-4 top-4 z-50 flex flex-col items-end gap-2">
          <button
            onClick={() => setShowTest((prev) => !prev)}
            className="rounded-xl bg-slate-900/10 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-900/20"
          >
            {showTest ? 'Hide' : 'Show'} Network Test
          </button>
          <button
            onClick={() => setShowDiagnostic((prev) => !prev)}
            className="rounded-xl bg-slate-900/10 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-900/20"
          >
            {showDiagnostic ? 'Hide' : 'Show'} Diagnostic
          </button>
        </div>

        {showDiagnostic ? <MetaMaskDiagnostic /> : showTest ? <NetworkTest /> : <WalletConnect />}
      </>
    );
  }

  const renderSection = () => {
    if (activeSection === 'dashboard') {
      switch (role) {
        case 'ADMIN':
          return <AdminDashboard />;
        case 'INSPECTOR':
          return <InspectorDashboard />;
        case 'APPROVER':
          return <ApproverDashboard />;
        case 'AUDITOR':
          return <AuditorDashboard />;
        default:
          return (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
              <h2 className="text-xl font-semibold text-slate-900">No role assigned</h2>
              <p className="mt-2 text-sm text-slate-600">Your wallet address: {account}</p>
              <p className="mt-1 text-sm text-slate-600">Please contact an administrator to assign a role.</p>
            </div>
          );
      }
    }

    if (activeSection === 'fileManagement') {
      return <FileManagement />;
    }

    if (activeSection === 'blockchain') {
      return <BlockchainActivityPanel />;
    }

    if (activeSection === 'auditLogs') {
      return <AuditLogs />;
    }

    if (activeSection === 'analytics') {
      return <AnalyticsDashboard />;
    }

    if (activeSection === 'settings') {
      return <Settings />;
    }

    if (activeSection === 'enterprise') {
      return <EnterpriseDashboard />;
    }

    return null;
  };

  return (
    <>
      <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection}>
        {renderSection()}
      </DashboardLayout>
      <AssistDock />
    </>
  );
}

function App() {
  return (
    <BlockchainProvider>
      <AppContent />
    </BlockchainProvider>
  );
}

export default App;
