import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { motion } from 'framer-motion';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const KpiCard = ({ label, value, color }) => (
  <motion.div whileHover={{ scale: 1.02 }} className={`kpi-card ${color}`}>
    <p className="text-gray-400 text-sm">{label}</p>
    <p className="text-3xl font-bold mt-2">{value}</p>
  </motion.div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({ projects: 0, revenue: 0, uptime: 0 });
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    async function fetchData() {
      try {
        const [projRes, finRes, uptRes] = await Promise.all([
          api.get('/projects'),
          api.get('/finance/sales'),
          api.get('/uptime/status')
        ]);
        const total = projRes.data.length;
        const revenue = finRes.data.total || 0;
        const up = uptRes.data.filter(p => p.status === 'up').length;
        const uptime = total ? ((up / total) * 100).toFixed(1) : 0;
        setStats({ projects: total, revenue, uptime });
      } catch (err) { console.error(err); }
    }
    fetchData();

    const labels = [], values = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now - i * 60 * 60000);
      labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      values.push(Math.floor(Math.random() * 300 + 50));
    }
    setChartData({
      labels,
      datasets: [{
        label: 'Avg Response Time (ms)',
        data: values,
        backgroundColor: 'rgba(59,130,246,0.6)',
        borderRadius: 6,
      }]
    });
  }, []);

  const critical = stats.projects - Math.round((stats.uptime * stats.projects) / 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Projects" value={stats.projects} color="blue" />
        <KpiCard label="Total Revenue" value={formatCurrency(stats.revenue)} color="green" />
        <KpiCard label="Avg Uptime" value={`${stats.uptime}%`} color="indigo" />
        <KpiCard label="Critical Alerts" value={critical} color="red" />
      </div>

      <div className="glass p-6">
        <h3 className="text-lg font-semibold mb-4">System Response Time (Last 24h)</h3>
        <div className="h-64">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
