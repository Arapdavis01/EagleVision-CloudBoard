import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import StatusBadge from '../components/uptime/StatusBadge';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get(`/projects/${id}`).then(res => setProject(res.data));
    api.get(`/uptime/history/${id}?range=24h`).then(res => setHistory(res.data));
  }, [id]);

  if (!project) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  const chartData = {
    labels: history.map(h => new Date(h.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [{
      label: 'Response Time (ms)',
      data: history.map(h => h.response_time_ms),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
    }]
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{project.name}</h2>
          <p className="text-gray-400">{project.client_name}</p>
        </div>
        <StatusBadge status={project.liveStatus?.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-xl p-5">
          <p className="text-gray-400 text-sm">Latency</p>
          <p className="text-2xl font-bold mt-1">{project.liveStatus?.latency || '—'} ms</p>
        </div>
        <div className="bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-xl p-5">
          <p className="text-gray-400 text-sm">Status Code</p>
          <p className="text-2xl font-bold mt-1">{project.liveStatus?.status_code || '—'}</p>
        </div>
        <div className="bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-xl p-5">
          <p className="text-gray-400 text-sm">Last Checked</p>
          <p className="text-2xl font-bold mt-1">
            {project.liveStatus?.checked_at ? new Date(project.liveStatus.checked_at).toLocaleString() : '—'}
          </p>
        </div>
      </div>

      <div className="bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Response Time History</h3>
        <div className="h-64">
          <Line data={chartData} options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
              y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
          }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-xl p-5">
          <h4 className="font-semibold mb-3">Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Location</span><span>{project.location || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Live URL</span><a href={project.live_url} target="_blank" className="text-blue-400 hover:underline">{project.live_url || '—'}</a></div>
            <div className="flex justify-between"><span className="text-gray-400">GitHub</span><a href={project.github_repo} target="_blank" className="text-blue-400 hover:underline">{project.github_repo || '—'}</a></div>
            <div className="flex justify-between"><span className="text-gray-400">Hosting</span><span>{project.hosting_platform || '—'}</span></div>
          </div>
        </div>
        <div className="bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-xl p-5">
          <h4 className="font-semibold mb-3">Description</h4>
          <p className="text-gray-400 text-sm">{project.description || 'No description'}</p>
        </div>
      </div>
    </div>
  );
}
