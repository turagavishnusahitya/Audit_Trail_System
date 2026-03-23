import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function aggregateGas(records, action) {
  const scoped = records.filter((r) => r.action === action);
  if (scoped.length === 0) {
    return { avg: 0, latest: 0 };
  }

  const total = scoped.reduce((sum, row) => sum + (row.gasUsed || 0), 0);
  const latest = scoped[0]?.gasUsed || 0;
  return {
    avg: Math.round(total / scoped.length),
    latest,
  };
}

export default function GasCostAnalyticsPanel({ activityRecords = [] }) {
  const metrics = useMemo(() => {
    const create = aggregateGas(activityRecords, 'Create');
    const approve = aggregateGas(activityRecords, 'Approve');
    return { create, approve };
  }, [activityRecords]);

  const chartData = {
    labels: ['createInspection', 'approveInspection'],
    datasets: [
      {
        label: 'Average Gas Used',
        data: [metrics.create.avg, metrics.approve.avg],
        backgroundColor: ['#3b82f6', '#10b981'],
      },
      {
        label: 'Latest Gas Used',
        data: [metrics.create.latest, metrics.approve.latest],
        backgroundColor: ['#93c5fd', '#6ee7b7'],
      },
    ],
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
      <h2 className="text-lg font-semibold text-slate-900">Gas Cost Analytics Dashboard</h2>
      <p className="mt-1 text-sm text-slate-500">
        Transaction receipts are parsed from blockchain events to profile create and approve costs.
      </p>

      <div className="mt-4">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: { position: 'bottom' },
            },
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: 'Gas Units' },
              },
            },
          }}
        />
      </div>
    </section>
  );
}
