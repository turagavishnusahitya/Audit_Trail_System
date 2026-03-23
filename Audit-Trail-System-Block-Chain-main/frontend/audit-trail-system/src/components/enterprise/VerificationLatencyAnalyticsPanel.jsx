import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { api } from '../../utils/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function VerificationLatencyAnalyticsPanel() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLatency = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.getVerificationLatencyAnalytics();
        setSamples(response.samples || []);
      } catch (err) {
        console.error('Latency analytics load failed:', err);
        setError(err.message || 'Failed to load latency analytics');
      } finally {
        setLoading(false);
      }
    };

    loadLatency();
  }, []);

  const chartData = useMemo(() => {
    const labels = samples.map((sample) => `${sample.dataSizeKB} KB`);
    const values = samples.map((sample) => sample.latencyMs);
    return {
      labels,
      datasets: [
        {
          label: 'Verification Latency (ms)',
          data: values,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.2)',
          tension: 0.3,
        },
      ],
    };
  }, [samples]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Verification Latency Analytics</h2>
      <p className="mt-1 text-sm text-slate-500">X-axis: data size, Y-axis: verification latency.</p>

      {loading && <p className="mt-4 text-sm text-slate-500">Loading latency analytics...</p>}
      {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {!loading && !error && (
        <div className="mt-4">
          <Line
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: { display: true, position: 'bottom' },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Latency (ms)',
                  },
                },
                x: {
                  title: {
                    display: true,
                    text: 'Data Size',
                  },
                },
              },
            }}
          />
        </div>
      )}
    </section>
  );
}
