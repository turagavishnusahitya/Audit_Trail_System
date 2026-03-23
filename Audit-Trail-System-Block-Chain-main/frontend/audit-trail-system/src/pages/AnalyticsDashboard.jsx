import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { api } from '../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

const REFRESH_INTERVAL_MS = 8000;

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async (options = {}) => {
    const { silent = false } = options;

    if (!silent) {
      setLoading(true);
      setError('');
    }

    try {
      const data = await api.getInspectionReport();
      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchStats({ silent: true });
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchStats]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats({ silent: true });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchStats]);

  const fileMetrics = useMemo(() => {
    const fallbackTamperingAlerts = stats?.tamperingAlerts ?? 0;
    const fallbackTotalFiles = stats?.totalFiles ?? 0;
    return {
      totalFiles: stats?.fileMetrics?.totalFiles ?? fallbackTotalFiles,
      verifiedFiles: stats?.fileMetrics?.verifiedFiles ?? 0,
      unverifiedFiles: stats?.fileMetrics?.unverifiedFiles ?? 0,
      authenticFiles: stats?.fileMetrics?.authenticFiles ?? 0,
      tamperedFiles: stats?.fileMetrics?.tamperedFiles ?? 0,
      totalVerifications: stats?.fileMetrics?.totalVerifications ?? 0,
      tamperingAlerts: stats?.fileMetrics?.tamperingAlerts ?? fallbackTamperingAlerts,
    };
  }, [stats]);

  const uploadLabels = useMemo(() => {
    if (!stats?.fileMonthlyUploads) return [];
    return Object.keys(stats.fileMonthlyUploads).sort();
  }, [stats]);

  const uploadData = useMemo(() => {
    if (!stats?.fileMonthlyUploads) return [];
    return uploadLabels.map((label) => stats.fileMonthlyUploads[label] ?? 0);
  }, [stats, uploadLabels]);

  const verificationLabels = useMemo(() => {
    if (!stats?.fileMonthlyVerifications) return [];
    return Object.keys(stats.fileMonthlyVerifications).sort();
  }, [stats]);

  const verificationData = useMemo(() => {
    if (!stats?.fileMonthlyVerifications) return [];
    return verificationLabels.map((label) => stats.fileMonthlyVerifications[label] ?? 0);
  }, [stats, verificationLabels]);

  const pieData = useMemo(() => {
    const breakdown = stats?.verificationStatusBreakdown || {
      Authentic: fileMetrics.authenticFiles,
      Tampered: fileMetrics.tamperedFiles,
      Unverified: fileMetrics.unverifiedFiles,
    };

    return {
      labels: ['Authentic', 'Tampered', 'Unverified'],
      datasets: [
        {
          data: [
            breakdown.Authentic ?? 0,
            breakdown.Tampered ?? 0,
            breakdown.Unverified ?? 0,
          ],
          backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
        },
      ],
    };
  }, [stats, fileMetrics]);

  const exportCsv = () => {
    if (!stats) return;

    const rows = [
      ['Metric', 'Value'],
      ['Total Files', fileMetrics.totalFiles],
      ['Verified Files', fileMetrics.verifiedFiles],
      ['Unverified Files', fileMetrics.unverifiedFiles],
      ['Authentic Files', fileMetrics.authenticFiles],
      ['Tampered Files', fileMetrics.tamperedFiles],
      ['Total Verifications', fileMetrics.totalVerifications],
      ['Tampering Alerts', fileMetrics.tamperingAlerts],
      ['Blockchain Transactions', stats.blockchainTxCount ?? 0],
    ];

    const uploaderPerformance = stats?.fileUploaderPerformance || {};
    Object.entries(uploaderPerformance).forEach(([uploader, values]) => {
      rows.push([
        `Uploader ${uploader} | files=${values.totalFiles} verified=${values.verifiedFiles} tampered=${values.tamperedFiles}`,
        values.totalVerifications ?? 0,
      ]);
    });

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'file-history-analytics.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const exportPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Analytics & Reporting</h1>
            <p className="mt-1 text-sm text-slate-500">
              Live file-history analytics from uploads and verification records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchStats()}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              Refresh
            </button>
            <button
              onClick={exportCsv}
              className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              Export CSV
            </button>
            <button
              onClick={exportPdf}
              className="rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              Export PDF
            </button>
          </div>
        </div>

        {lastUpdated && (
          <p className="mt-3 text-xs text-slate-500">
            Auto refresh every {Math.floor(REFRESH_INTERVAL_MS / 1000)}s. Last updated{' '}
            {lastUpdated.toLocaleTimeString()}.
          </p>
        )}

        {loading && <p className="mt-4 text-sm text-slate-500">Loading analytics...</p>}
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

        {stats && (
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 p-6 text-white shadow-soft">
              <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Total Files</p>
              <p className="mt-3 text-3xl font-semibold">{fileMetrics.totalFiles}</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-500">Verified Files</p>
              <p className="mt-3 text-3xl font-semibold text-emerald-600">{fileMetrics.verifiedFiles}</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-500">Unverified Files</p>
              <p className="mt-3 text-3xl font-semibold text-amber-600">{fileMetrics.unverifiedFiles}</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-500">Authentic Files</p>
              <p className="mt-3 text-3xl font-semibold text-emerald-600">{fileMetrics.authenticFiles}</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-500">Tampered Files</p>
              <p className="mt-3 text-3xl font-semibold text-rose-600">{fileMetrics.tamperedFiles}</p>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold text-slate-500">Total Verifications</p>
              <p className="mt-3 text-3xl font-semibold text-brand-600">{fileMetrics.totalVerifications}</p>
            </div>
          </div>
        )}
      </div>

      {stats && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">File Uploads Per Month</h2>
            <div className="mt-4">
              <Bar
                data={{
                  labels: uploadLabels,
                  datasets: [{ label: 'Uploads', data: uploadData, backgroundColor: '#3b82f6' }],
                }}
                options={{ responsive: true, plugins: { legend: { display: false } } }}
              />
            </div>
          </div>

          <div className="col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">Verification Status</h2>
            <div className="mt-4">
              <Pie data={pieData} options={{ responsive: true }} />
            </div>
          </div>

          <div className="col-span-1 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-lg font-semibold text-slate-900">Verification Trend</h2>
            <div className="mt-4">
              <Line
                data={{
                  labels: verificationLabels,
                  datasets: [
                    {
                      label: 'Verifications',
                      data: verificationData,
                      borderColor: '#2563eb',
                      backgroundColor: 'rgba(37, 99, 235, 0.3)',
                      tension: 0.3,
                    },
                  ],
                }}
                options={{ responsive: true, plugins: { legend: { display: false } } }}
              />
            </div>
          </div>
        </div>
      )}

      {stats?.fileUploaderPerformance && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-lg font-semibold text-slate-900">Uploader Performance</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Uploader</th>
                  <th className="px-4 py-3">Files</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Tampered</th>
                  <th className="px-4 py-3">Verifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(stats.fileUploaderPerformance).map(([uploader, values]) => (
                  <tr key={uploader} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{uploader}</td>
                    <td className="px-4 py-3">{values.totalFiles ?? 0}</td>
                    <td className="px-4 py-3 text-emerald-600">{values.verifiedFiles ?? 0}</td>
                    <td className="px-4 py-3 text-rose-600">{values.tamperedFiles ?? 0}</td>
                    <td className="px-4 py-3 text-brand-600">{values.totalVerifications ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
