const API_BASE_URL = 'http://localhost:8000';

const fetchJson = async (url, options = {}, defaultErrorMessage = 'Request failed') => {
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = defaultErrorMessage;
    try {
      const errorBody = await response.json();
      if (errorBody?.detail) {
        errorMessage = errorBody.detail;
      }
    } catch {
      // Ignore response parse errors and use default error message.
    }
    throw new Error(errorMessage);
  }

  return response.json();
};

export const api = {
  // Create inspection in backend
  createInspection: async (inspectionData) => {
    const response = await fetch(`${API_BASE_URL}/api/inspections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inspectionData),
    });

    if (!response.ok) {
      throw new Error('Failed to create inspection');
    }

    return response.json();
  },

  // Get inspection from backend
  getInspection: async (reportId) => {
    const response = await fetch(`${API_BASE_URL}/api/inspections/${reportId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch inspection');
    }

    return response.json();
  },

  // Verify inspection hash
  verifyInspection: async (reportId) => {
    const response = await fetch(`${API_BASE_URL}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reportId }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify inspection');
    }

    return response.json();
  },

  // Timeline / analytics
  getInspectionTimeline: async (reportId) => {
    return fetchJson(
      `${API_BASE_URL}/api/inspections/${reportId}/timeline`,
      {},
      'Failed to fetch timeline'
    );
  },

  getInspectionReport: async () => {
    return fetchJson(`${API_BASE_URL}/api/reports/inspections`, {}, 'Failed to load analytics');
  },

  addInspectionEvent: async (reportId, event) => {
    const response = await fetch(`${API_BASE_URL}/api/inspections/${reportId}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error('Failed to save inspection event');
    }

    return response.json();
  },

  getInspectionIntegrity: async (reportId) => {
    return fetchJson(
      `${API_BASE_URL}/api/inspections/${reportId}/integrity`,
      {},
      'Failed to fetch integrity snapshot'
    );
  },

  simulateInspectionTamper: async (reportId, payload = {}) => {
    return fetchJson(
      `${API_BASE_URL}/api/inspections/${reportId}/simulate-tamper`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      'Failed to simulate tampering'
    );
  },

  getVerificationLatencyAnalytics: async () => {
    return fetchJson(
      `${API_BASE_URL}/api/analytics/verification-latency`,
      {},
      'Failed to fetch latency analytics'
    );
  },

  submitFeedback: async (payload) => {
    return fetchJson(
      `${API_BASE_URL}/api/feedback`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      'Failed to submit feedback'
    );
  },

  generateCertificate: async (payload) => {
    return fetchJson(
      `${API_BASE_URL}/api/certificates/generate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      'Failed to generate certificate'
    );
  },

  getCertificates: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.fileId) query.set('fileId', params.fileId);
    if (params.wallet) query.set('wallet', params.wallet);
    if (params.limit) query.set('limit', String(params.limit));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    return fetchJson(
      `${API_BASE_URL}/api/certificates${suffix}`,
      {},
      'Failed to load certificates'
    );
  },

  validateCertificate: async (certificateId) => {
    return fetchJson(
      `${API_BASE_URL}/api/certificates/${certificateId}/validate`,
      {},
      'Failed to validate certificate'
    );
  },

  // ==================== FILE UPLOAD ENDPOINTS ====================

  // Upload file and get hash
  uploadFile: async (file, uploaderAddress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploaderAddress', uploaderAddress);

    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    return response.json();
  },

  // Verify file integrity using blockchain hash
  verifyFileWithHash: async (fileId, blockchainHash) => {
    const response = await fetch(`${API_BASE_URL}/api/files/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        blockchainHash,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify file');
    }

    return response.json();
  },

  // Re-upload file to verify integrity
  reUploadFileForVerification: async (fileId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/re-upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to verify file');
    }

    return response.json();
  },

  // Get file details
  getFileDetails: async (fileId) => {
    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch file details');
    }

    return response.json();
  },

  // Get all files list
  getAllFiles: async () => {
    return fetchJson(`${API_BASE_URL}/api/files`, {}, 'Failed to fetch files');
  },
};
