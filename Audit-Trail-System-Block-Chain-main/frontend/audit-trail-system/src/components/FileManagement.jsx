import React, { useCallback, useEffect, useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';
import { api } from '../utils/api';
import {
  buildCertificate,
  buildProofUrl,
  downloadCertificate,
  generateQRCodeDataUrl,
  printCertificate,
} from '../utils/certificate';

const TABS = [
  { key: 'upload', label: 'Upload File' },
  { key: 'verify', label: 'Verify File' },
  { key: 'history', label: 'File History' },
  { key: 'certificates', label: 'Certificates' },
];

export default function FileManagement() {
  const { account, contract, role } = useBlockchain();
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [fileHash, setFileHash] = useState('');
  const [fileId, setFileId] = useState('');
  const [ipfsHash, setIpfsHash] = useState('');
  const [ipfsUrl, setIpfsUrl] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [columnCount, setColumnCount] = useState(0);

  const [verifyFileId, setVerifyFileId] = useState('');
  const [blockchainHash, setBlockchainHash] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const [filesList, setFilesList] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [lastHistoryUpdated, setLastHistoryUpdated] = useState(null);

  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [certificate, setCertificate] = useState(null);
  const [certificateQr, setCertificateQr] = useState('');
  const [certificateValidation, setCertificateValidation] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certificateSearch, setCertificateSearch] = useState('');
  const [certificateChecks, setCertificateChecks] = useState({});
  const [monitoring, setMonitoring] = useState(false);
  const [monitoringMessage, setMonitoringMessage] = useState('');

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 4000);
  }, []);

  const API_BASE_URL = 'http://localhost:8000';

  const issueCertificate = useCallback(async (payload) => {
    try {
      const issued = await api.generateCertificate({
        fileId: payload.fileId,
        fileName: payload.fileName,
        fileHash: payload.fileHash,
        txHash: payload.txHash,
        verifier: account,
        wallet: account,
        proofUrl: payload.proofUrl,
        metadata: {
          role: role || 'UNKNOWN',
          source: payload.source || 'file-management',
        },
      });

      const cert = buildCertificate({
        certificateId: issued.certificateId,
        fileName: issued.fileName,
        fileHash: issued.fileHash,
        txHash: issued.txHash,
        verifier: issued.verifier || account,
        timestamp: issued.issuedAt,
        proofUrl: issued.proofUrl || payload.proofUrl,
        status: issued.status || 'ACTIVE',
      });

      setCertificate(cert);
      setCertificateValidation(null);
      const qr = await generateQRCodeDataUrl(cert.proofUrl || cert.fileHash || cert.certificateId || '');
      setCertificateQr(qr);
      return cert;
    } catch (error) {
      showToast(`Certificate generation skipped: ${error.message}`, 'error');
      return null;
    }
  }, [account, role, showToast]);

  const loadCertificates = useCallback(async (options = {}) => {
    const { silent = false } = options;
    if (!silent) {
      setCertificatesLoading(true);
    }

    try {
      const response = await api.getCertificates({
        wallet: account || undefined,
        limit: 100,
      });
      setCertificates(response.certificates || []);
    } catch (error) {
      if (!silent) {
        showToast(`Failed to load certificates: ${error.message}`, 'error');
      }
    } finally {
      if (!silent) {
        setCertificatesLoading(false);
      }
    }
  }, [account, showToast]);

  const validateCertificateById = useCallback(async (certificateId) => {
    if (!certificateId) return;

    try {
      const result = await api.validateCertificate(certificateId);
      setCertificateChecks((prev) => ({
        ...prev,
        [certificateId]: result,
      }));

      if (certificate?.certificateId === certificateId) {
        setCertificateValidation(result);
      }
    } catch (error) {
      showToast(`Certificate validation failed: ${error.message}`, 'error');
    }
  }, [certificate, showToast]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadMessage('');
    setFileHash('');
    setFileId('');

    try {
      const validTypes = ['.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.pdf'];
      const fileName = file.name;
      const isValidFile = validTypes.some((type) => fileName.toLowerCase().endsWith(type));

      if (!isValidFile) {
        setUploadMessage('❌ Supported file types: .xlsx, .xls, .csv, .png, .jpg, .jpeg, .pdf');
        setUploadLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploaderAddress', account || 'unknown');

      const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'File upload failed');
      }

      const data = await response.json();

      setFileId(data.fileId);
      setFileHash(data.fileHash);
      setIpfsHash(data.ipfsHash || '');
      setIpfsUrl(data.ipfsUrl || '');
      setRowCount(data.rowCount || 0);
      setColumnCount(data.columnCount || 0);

      let message = `✅ File uploaded successfully!\n\nFile ID: ${data.fileId}\nFile Size: ${(data.fileSize / 1024).toFixed(2)} KB`;
      if (data.ipfsHash) {
        message += `\nIPFS Hash: ${data.ipfsHash}`;
      }
      if (data.ipfsUrl) {
        message += `\nView on IPFS: ${data.ipfsUrl}`;
      }

      setUploadMessage(message);
      setUploadedFile(file);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage(`❌ Error: ${error.message}`);
    } finally {
      setUploadLoading(false);
    }
  };

  const storeHashOnBlockchain = async () => {
    if (!fileHash || !fileId) {
      showToast('No file available to store. Please upload first.', 'error');
      return;
    }

    if (!contract) {
      showToast('Wallet not connected or contract not available.', 'error');
      return;
    }

    try {
      setUploadMessage('⏳ Storing hash on blockchain...');

      const hashBytes32 = '0x' + fileHash;

      const tx = await contract.recordFileHash(
        fileId,
        uploadedFile.name,
        hashBytes32,
        ipfsHash || '',
        uploadedFile.size,
        rowCount,
        columnCount
      );

      setUploadMessage('⏳ Transaction pending...');
      const receipt = await tx.wait();

      setUploadMessage(
        `✅ Hash stored on blockchain!\n\nTransaction: ${receipt.hash}\nBlock: ${receipt.blockNumber}`
      );

      const proofUrl = buildProofUrl(receipt.hash);
      await issueCertificate({
        fileId,
        fileName: uploadedFile?.name,
        fileHash,
        txHash: receipt.hash,
        proofUrl,
        source: 'store-hash',
      });
    } catch (error) {
      console.error('Blockchain error:', error);
      setUploadMessage(`❌ Blockchain error: ${error.message}`);
    }
  };

  const handleReUploadForVerification = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVerifyLoading(true);
    setVerificationResult(null);

    try {
      if (!verifyFileId) {
        showToast('Please enter a File ID to verify.', 'error');
        setVerifyLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/files/${verifyFileId}/re-upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Verification failed');
      }

      const result = await response.json();
      setVerificationResult(result);
      loadFilesList({ silent: true });

      if (result.isAuthentic) {
        await issueCertificate({
          fileId: result.fileId,
          fileName: result.fileName,
          fileHash: result.originalHash || '',
          txHash: '',
          proofUrl: '',
          source: 'verify-reupload',
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        isAuthentic: false,
        message: `❌ Error: ${error.message}`,
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const verifyWithBlockchainHash = async () => {
    if (!verifyFileId || !blockchainHash) {
      showToast('Please enter both File ID and Blockchain Hash.', 'error');
      return;
    }

    setVerifyLoading(true);
    setVerificationResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/files/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: verifyFileId,
          blockchainHash: blockchainHash,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Verification failed');
      }

      const result = await response.json();
      setVerificationResult(result);
      loadFilesList({ silent: true });

      if (result.isAuthentic) {
        const proofUrl = buildProofUrl(blockchainHash);
        await issueCertificate({
          fileId: result.fileId,
          fileName: result.fileName,
          fileHash: result.originalHash || result.storedHash || '',
          txHash: blockchainHash,
          proofUrl,
          source: 'verify-hash',
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        isAuthentic: false,
        message: `❌ Error: ${error.message}`,
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const loadFilesList = useCallback(async (options = {}) => {
    const { silent = false } = options;

    if (!silent) {
      setFilesLoading(true);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/files`);
      if (!response.ok) throw new Error('Failed to load files');

      const data = await response.json();
      setFilesList(data.files || []);
      setLastHistoryUpdated(new Date());
    } catch (error) {
      console.error('Error loading files:', error);
      if (!silent) {
        showToast(`Failed to load files: ${error.message}`, 'error');
      }
    } finally {
      if (!silent) {
        setFilesLoading(false);
      }
    }
  }, [showToast]);

  useEffect(() => {
    if (activeTab !== 'history') return undefined;

    loadFilesList();
    const intervalId = setInterval(() => {
      loadFilesList({ silent: true });
    }, 8000);

    return () => clearInterval(intervalId);
  }, [activeTab, loadFilesList]);

  useEffect(() => {
    if (activeTab !== 'certificates') return undefined;

    loadCertificates();
    const intervalId = setInterval(() => {
      loadCertificates({ silent: true });
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeTab, loadCertificates]);

  const renderCertificatePanel = () => {
    if (!certificate) return null;

    const isValid = certificateValidation?.isValid;
    const validationTone = certificateValidation
      ? isValid
        ? 'bg-emerald-100 text-emerald-700'
        : 'bg-rose-100 text-rose-700'
      : 'bg-slate-100 text-slate-700';

    return (
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-emerald-800">Integrity Certificate</h3>
            <p className="mt-1 text-sm text-emerald-700">
              Verifiable proof generated from this workflow. Download and share as audit evidence.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-emerald-200">
                ID: {certificate.certificateId || 'Pending'}
              </span>
              <span className={`rounded-full px-3 py-1 font-semibold ${validationTone}`}>
                {certificateValidation
                  ? certificateValidation.status
                  : (certificate.status || 'UNVERIFIED')}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadCertificate(
                  certificate,
                  `${(certificate.fileName || 'audit-file').replace(/\s+/g, '_')}-certificate.json`
                )
              }
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Download JSON
            </button>
            <button
              type="button"
              onClick={() => {
                const opened = printCertificate(certificate, certificateValidation);
                if (!opened) {
                  showToast('Allow popups to print certificate PDF.', 'error');
                }
              }}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
            >
              Print / Save PDF
            </button>
            {certificate.certificateId && (
              <button
                type="button"
                onClick={() => validateCertificateById(certificate.certificateId)}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
              >
                Validate Certificate
              </button>
            )}
            {certificate.proofUrl && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(certificate.proofUrl);
                  showToast('Proof URL copied to clipboard.', 'success');
                }}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
              >
                Copy Proof URL
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Certificate Details</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">Certificate ID:</span> {certificate.certificateId || '-'}</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">File:</span> {certificate.fileName || '-'}</p>
            <p className="break-all text-sm text-slate-700"><span className="font-semibold">Hash:</span> {certificate.fileHash || '-'}</p>
            <p className="break-all text-sm text-slate-700"><span className="font-semibold">Tx Hash:</span> {certificate.txHash || '-'}</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">Verifier:</span> {certificate.verifier || '-'}</p>
            <p className="text-sm text-slate-700"><span className="font-semibold">Timestamp:</span> {new Date(certificate.timestamp).toLocaleString()}</p>
            {certificateValidation?.reason && (
              <p className="text-sm text-slate-700"><span className="font-semibold">Validation:</span> {certificateValidation.reason}</p>
            )}
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scan / Open Proof</p>
            {certificateQr ? (
              <img
                src={certificateQr}
                alt="Certificate proof QR"
                className="mt-3 h-44 w-44 rounded-lg border border-slate-200 bg-white p-2"
              />
            ) : (
              <p className="mt-3 text-sm text-slate-500">QR code unavailable.</p>
            )}
            {certificate.proofUrl && (
              <a
                href={certificate.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Open proof link
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  const filteredCertificates = certificates.filter((item) => {
    const query = certificateSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      (item.certificateId || '').toLowerCase().includes(query) ||
      (item.fileName || '').toLowerCase().includes(query) ||
      (item.fileId || '').toLowerCase().includes(query) ||
      (item.fileHash || '').toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (activeTab !== 'history' && activeTab !== 'certificates') return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (activeTab === 'history') {
          loadFilesList({ silent: true });
        } else if (activeTab === 'certificates') {
          loadCertificates({ silent: true });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab, loadFilesList, loadCertificates]);

  if (role !== 'INSPECTOR' && role !== 'ADMIN') {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center shadow-soft">
        <h2 className="text-2xl font-semibold text-rose-700">Access Denied</h2>
        <p className="mt-2 text-sm text-rose-600">Only Inspectors and Admins can manage files.</p>
        <p className="mt-1 text-sm text-slate-600">Your role: {role}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast.message && (
        <div
          className={`rounded-2xl border p-4 text-sm font-medium ${
            toast.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}
        >
          {toast.message}
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">File Management</h1>
            <p className="mt-1 text-sm text-slate-500">Upload documents, verify integrity, and review history.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'upload' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Upload a file</h2>
          <p className="mt-1 text-sm text-slate-500">Upload a new file to generate a hash and store it on the blockchain.</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-sm font-semibold text-slate-800">How it works</h3>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                <li>1. Upload a file.</li>
                <li>2. System computes a SHA-256 fingerprint.</li>
                <li>3. Store fingerprint on blockchain.</li>
                <li>4. File becomes tamper-evident.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-4">
                <label className="block text-sm font-semibold text-slate-700">Select file</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploadLoading}
                  className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />

                {uploadMessage && (
                  <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                      uploadMessage.includes('✅')
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap break-all">{uploadMessage}</pre>
                  </div>
                )}

                {fileHash && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-800">File Hash (SHA-256)</p>
                      <div className="mt-2 flex flex-col gap-2">
                        <code className="break-words rounded-lg bg-white px-3 py-2 text-xs font-mono text-slate-700 shadow-sm">{fileHash}</code>
                        <button
                          onClick={() => navigator.clipboard.writeText(fileHash)}
                          className="w-max rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
                        >
                          Copy Hash
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={storeHashOnBlockchain}
                        disabled={uploadLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        ⛓️ Store on Blockchain
                      </button>

                      {!account && (
                        <p className="text-sm text-amber-600">Connect your wallet to store the hash.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {renderCertificatePanel()}
        </div>
      )}

      {activeTab === 'verify' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Verify File Integrity</h2>
          <p className="mt-1 text-sm text-slate-500">Validate a file against stored hashes or re-upload to verify.</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-sm font-semibold text-slate-800">Re-upload file for verification</h3>
              <p className="mt-1 text-sm text-slate-600">Upload a file and compare its computed hash to the stored version.</p>

              <div className="mt-4 space-y-4">
                <input
                  type="text"
                  placeholder="Enter File ID"
                  value={verifyFileId}
                  onChange={(e) => setVerifyFileId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />

                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleReUploadForVerification}
                  disabled={verifyLoading}
                  className="block w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-sm font-semibold text-slate-800">Verify with blockchain hash</h3>
              <p className="mt-1 text-sm text-slate-600">Enter the file ID and hash stored on the blockchain.</p>

              <div className="mt-4 space-y-4">
                <input
                  type="text"
                  placeholder="Enter File ID"
                  value={verifyFileId}
                  onChange={(e) => setVerifyFileId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
                <input
                  type="text"
                  placeholder="Enter Blockchain Hash (0x...)"
                  value={blockchainHash}
                  onChange={(e) => setBlockchainHash(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                />
                <button
                  onClick={verifyWithBlockchainHash}
                  disabled={verifyLoading}
                  className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifyLoading ? '⏳ Verifying…' : '✅ Verify'}
                </button>
              </div>
            </div>
          </div>

          {verificationResult && (
            <div
              className={`mt-6 rounded-2xl border p-6 shadow-soft ${
                verificationResult.isAuthentic ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              <h3 className="text-lg font-semibold">
                {verificationResult.isAuthentic ? '✅ File is Authentic' : '❌ File Has Been Tampered!'}
              </h3>
              <p className="mt-2 text-sm">{verificationResult.message}</p>

              <div className="mt-4 space-y-3 rounded-xl bg-white p-4 shadow-sm">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">File ID:</span> {verificationResult.fileId}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">File Name:</span> {verificationResult.fileName}
                </p>

                {verificationResult.originalHash && (
                  <div className="grid gap-3 rounded-xl bg-slate-50 p-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Original Hash</div>
                      <code className="mt-1 block break-words rounded bg-white px-3 py-2 text-xs font-mono text-slate-700">
                        {verificationResult.originalHash}
                      </code>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">Current Hash</div>
                      <code className="mt-1 block break-words rounded bg-white px-3 py-2 text-xs font-mono text-slate-700">
                        {verificationResult.currentHash}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {renderCertificatePanel()}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">File Upload History</h2>
              <p className="mt-1 text-sm text-slate-500">Browse previously uploaded files and their verification status.</p>
              {lastHistoryUpdated && (
                <p className="mt-1 text-xs text-slate-500">
                  Auto refresh every 8s. Last updated {lastHistoryUpdated.toLocaleTimeString()}.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => loadFilesList()}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Refresh
            </button>
          </div>

          {filesLoading ? (
            <div className="mt-6 text-sm text-slate-500">Loading files...</div>
          ) : filesList.length === 0 ? (
            <div className="mt-6 text-sm text-slate-500">No files uploaded yet.</div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">File ID</th>
                    <th className="px-4 py-3">Uploaded By</th>
                    <th className="px-4 py-3">Uploaded At</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Hash</th>
                    <th className="px-4 py-3">Verifications</th>
                    <th className="px-4 py-3">Last Verified</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filesList.map((file) => (
                    <tr key={file.fileId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{file.fileName}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="truncate rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">
                            {file.fileId}
                          </code>
                          <button
                            className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-semibold text-white"
                            onClick={() => {
                              navigator.clipboard.writeText(file.fileId);
                              showToast('File ID copied to clipboard.', 'success');
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">{file.uploadedBy.slice(0, 10)}...</td>
                      <td className="px-4 py-3">{new Date(file.uploadedAt).toLocaleString()}</td>
                      <td className="px-4 py-3">{(file.fileSize / 1024).toFixed(2)} KB</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <code className="truncate rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">
                            {file.fileHash}
                          </code>
                          <button
                            className="self-start rounded-lg bg-brand-600 px-2 py-1 text-xs font-semibold text-white"
                            onClick={() => {
                              navigator.clipboard.writeText(file.fileHash);
                              showToast('File hash copied to clipboard.', 'success');
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">{file.totalVerifications || 0}</td>
                      <td className="px-4 py-3">
                        {file.lastVerified ? new Date(file.lastVerified).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            file.tamperedCount > 0
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {file.tamperedCount > 0 ? `Tampered (${file.tamperedCount})` : 'Authentic'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'certificates' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Certificate Registry</h2>
              <p className="mt-1 text-sm text-slate-500">View issued integrity certificates and validate them against current file state.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={certificateSearch}
                onChange={(e) => setCertificateSearch(e.target.value)}
                placeholder="Search certificate ID / file"
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <button
                type="button"
                onClick={() => loadCertificates()}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
              >
                Refresh
              </button>
            </div>
          </div>

          {certificatesLoading ? (
            <div className="mt-6 text-sm text-slate-500">Loading certificates...</div>
          ) : filteredCertificates.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No certificates found yet. Certificates are generated automatically after successful authentic verification/store flow.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Certificate ID</th>
                    <th className="px-4 py-3">File</th>
                    <th className="px-4 py-3">Issued At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Tx Hash</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCertificates.map((item) => {
                    const check = certificateChecks[item.certificateId];
                    return (
                      <tr key={item.certificateId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                            {item.certificateId}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{item.fileName || '-'}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.fileId}</div>
                        </td>
                        <td className="px-4 py-3">{item.issuedAt ? new Date(item.issuedAt).toLocaleString() : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            check
                              ? (check.isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {check ? check.status : (item.status || 'ACTIVE')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <code className="block max-w-[240px] break-all rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
                            {item.txHash || '-'}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                const proofPayload = item.proofUrl || item.fileHash || item.certificateId;
                                setCertificate(buildCertificate({
                                  certificateId: item.certificateId,
                                  fileName: item.fileName,
                                  fileHash: item.fileHash,
                                  txHash: item.txHash,
                                  verifier: item.verifier,
                                  timestamp: item.issuedAt,
                                  proofUrl: item.proofUrl,
                                  status: item.status,
                                }));
                                setCertificateValidation(check || null);
                                const qr = await generateQRCodeDataUrl(proofPayload);
                                setCertificateQr(qr);
                                showToast('Certificate opened in details panel.', 'success');
                              }}
                              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={() => validateCertificateById(item.certificateId)}
                              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                            >
                              Validate
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {renderCertificatePanel()}
        </div>
      )}
    </div>
  );
}
