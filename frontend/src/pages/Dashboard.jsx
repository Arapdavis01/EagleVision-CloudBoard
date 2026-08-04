import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { motion } from 'framer-motion';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();

    const labels = [];
    const values = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now - i * 60 * 60000);
      labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      values.push(Math.floor(Math.random() * 300 + 50));
    }
    setChartData({
      labels,
      datasets: [{ label: 'Avg Response Time (ms)', data: values, backgroundColor: '#3b82f6' }]
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-800 p-4 rounded-xl border-t-4 border-blue-500">
          <p className="text-gray-400">Total Projects</p>
          <p className="text-3xl font-bold">{stats.projects}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-800 p-4 rounded-xl border-t-4 border-green-500">
          <p className="text-gray-400">Total Revenue</p>
          <p className="text-3xl font-bold">{formatCurrency(stats.revenue)}</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-800 p-4 rounded-xl border-t-4 border-indigo-500">
          <p className="text-gray-400">Avg Uptime</p>
          <p className="text-3xl font-bold">{stats.uptime}%</p>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} className="bg-gray-800 p-4 rounded-xl border-t-4 border-red-500">
          <p className="text-gray-400">Critical Alerts</p>
          <p className="text-3xl font-bold">{stats.projects - Math.round((stats.uptime * stats.projects) / 100)}</p>
        </motion.div>
      </div>
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-xl font-semibold mb-4">System Response Time (Last 24h)</h3>
        <Bar data={chartData} options={{ responsive: true }} />
      </div>
    </div>
  );
}
