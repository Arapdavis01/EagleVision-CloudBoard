import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import StatusBadge from '../components/uptime/StatusBadge';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get(`/projects/${id}`).then(res => setProject(res.data));
    api.get(`/uptime/history/${id}?range=24h`).then(res => setHistory(res.data));
  }, [id]);

  if (!project) return <div className="p-8">Loading...</div>;

  const chartData = {
    labels: history.map(h => new Date(h.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    datasets: [{
      label: 'Response Time (ms)',
      data: history.map(h => h.response_time_ms),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.2)',
      fill: true,
    }]
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">{project.name}</h2>
          <p className="text-gray-400">{project.client_name}</p>
        </div>
        <StatusBadge status={project.liveStatus?.status} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 p-4 rounded-xl"><p className="text-gray-400">Latency</p><p className="text-2xl font-bold">{project.liveStatus?.latency || '—'} ms</p></div>
        <div className="bg-gray-800 p-4 rounded-xl"><p className="text-gray-400">Status Code</p><p className="text-2xl font-bold">{project.liveStatus?.status_code || '—'}</p></div>
        <div className="bg-gray-800 p-4 rounded-xl"><p className="text-gray-400">Last Checked</p><p className="text-2xl font-bold">{project.liveStatus?.checked_at ? new Date(project.liveStatus.checked_at).toLocaleString() : '—'}</p></div>
      </div>
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-xl font-semibold mb-4">Response Time History</h3>
        <Line data={chartData} options={{ responsive: true }} />
      </div>
    </div>
  );
}
