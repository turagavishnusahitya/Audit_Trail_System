import QRCode from 'qrcode';

const ETHERSCAN_TX_URL = (txHash) => `https://etherscan.io/tx/${txHash}`;

export function buildCertificate({
  certificateId,
  fileName,
  fileHash,
  txHash,
  verifier,
  timestamp,
  proofUrl,
  status = 'ACTIVE',
}) {
  return {
    certificateVersion: '1.0',
    certificateId,
    fileName,
    fileHash,
    txHash,
    verifier,
    timestamp,
    proofUrl,
    status,
  };
}

export function downloadCertificate(certificate, filename = 'integrity-certificate.json') {
  const blob = new Blob([JSON.stringify(certificate, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function generateQRCodeDataUrl(payload) {
  try {
    return await QRCode.toDataURL(payload, { margin: 1, width: 240 });
  } catch (error) {
    console.error('Failed to generate QR code', error);
    return null;
  }
}

export function buildProofUrl(txHash) {
  if (!txHash) return '';
  return ETHERSCAN_TX_URL(txHash);
}

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function printCertificate(certificate, validation = null) {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) return false;

  const statusLabel = validation?.status || certificate?.status || 'ACTIVE';
  const validText = validation?.isValid ? 'VALID' : validation ? 'INVALID' : 'UNVERIFIED';
  const issuedAt = certificate?.timestamp
    ? new Date(certificate.timestamp).toLocaleString()
    : '-';

  const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Integrity Certificate</title>
    <style>
      body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; margin: 0; padding: 24px; background: #f1f5f9; color: #0f172a; }
      .card { max-width: 920px; margin: 0 auto; background: white; border-radius: 20px; border: 1px solid #dbeafe; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.1); overflow: hidden; }
      .head { background: linear-gradient(135deg, #1d4ed8, #4338ca); color: white; padding: 24px; }
      .sub { margin: 6px 0 0; opacity: 0.92; font-size: 14px; }
      .body { padding: 24px; }
      .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: .03em; background: #e2e8f0; color: #0f172a; }
      .grid { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; margin-top: 16px; }
      .item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
      .label { font-size: 12px; text-transform: uppercase; color: #475569; letter-spacing: .06em; margin-bottom: 8px; }
      .value { word-break: break-all; font-size: 14px; }
      .foot { margin-top: 18px; font-size: 12px; color: #475569; }
      @media print { body { background: white; padding: 0; } .card { box-shadow: none; border: 1px solid #cbd5e1; border-radius: 0; } }
    </style>
  </head>
  <body>
    <section class="card">
      <header class="head">
        <h1>Digital Integrity Certificate</h1>
        <p class="sub">Blockchain-Based Secure Data Verification System</p>
      </header>
      <main class="body">
        <span class="badge">Validation: ${escapeHtml(validText)} | Certificate Status: ${escapeHtml(statusLabel)}</span>
        <div class="grid">
          <div class="item"><div class="label">Certificate ID</div><div class="value">${escapeHtml(certificate?.certificateId || '-')}</div></div>
          <div class="item"><div class="label">File Name</div><div class="value">${escapeHtml(certificate?.fileName || '-')}</div></div>
          <div class="item"><div class="label">File Hash (SHA-256)</div><div class="value">${escapeHtml(certificate?.fileHash || '-')}</div></div>
          <div class="item"><div class="label">Transaction Hash</div><div class="value">${escapeHtml(certificate?.txHash || '-')}</div></div>
          <div class="item"><div class="label">Verifier</div><div class="value">${escapeHtml(certificate?.verifier || '-')}</div></div>
          <div class="item"><div class="label">Issued At</div><div class="value">${escapeHtml(issuedAt)}</div></div>
          <div class="item"><div class="label">Proof URL</div><div class="value">${escapeHtml(certificate?.proofUrl || '-')}</div></div>
          <div class="item"><div class="label">Validation Reason</div><div class="value">${escapeHtml(validation?.reason || 'Verification pending')}</div></div>
        </div>
        <p class="foot">This certificate is generated from immutable blockchain-linked hashes and backend verification records.</p>
      </main>
    </section>
    <script>window.print();</script>
  </body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
