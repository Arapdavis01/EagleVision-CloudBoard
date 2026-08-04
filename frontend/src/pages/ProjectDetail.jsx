import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Card, Title, Metric, AreaChart, Text } from '@tremor/react';
import StatusBadge from '../components/uptime/StatusBadge';
import { motion } from 'framer-motion';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, histRes] = await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/uptime/history/${id}?range=24h`),
        ]);
        setProject(projRes.data);
        setHistory(histRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!project) return <div className="p-8">Project not found</div>;

  const chartData = history.map(h => ({
    time: new Date(h.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    'Response Time (ms)': h.response_time_ms,
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-bold">{project.name}</h2>
          {project.client_name && <Text className="text-gray-400">{project.client_name}</Text>}
        </div>
        <StatusBadge status={project.liveStatus?.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card decoration="top" decorationColor="blue">
          <Title>Current Latency</Title>
          <Metric>{project.liveStatus?.latency ?? '—'} ms</Metric>
        </Card>
        <Card decoration="top" decorationColor="indigo">
          <Title>Status Code</Title>
          <Metric>{project.liveStatus?.status_code || 'N/A'}</Metric>
        </Card>
        <Card decoration="top" decorationColor="green">
          <Title>Last Checked</Title>
          <Metric>
            {project.liveStatus?.checked_at
              ? new Date(project.liveStatus.checked_at).toLocaleString()
              : '—'}
          </Metric>
        </Card>
      </div>

      <Card>
        <Title>Response Time History (24h)</Title>
        <AreaChart
          data={chartData}
          index="time"
          categories={['Response Time (ms)']}
          colors={['blue']}
          yAxisWidth={60}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <Title>Project Details</Title>
          <div className="space-y-2 mt-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Location</span><span>{project.location || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Live URL</span><a href={project.live_url} target="_blank" className="text-blue-400 underline">{project.live_url || '—'}</a></div>
            <div className="flex justify-between"><span className="text-gray-400">GitHub</span><a href={project.github_repo} target="_blank" className="text-blue-400 underline">{project.github_repo || '—'}</a></div>
            <div className="flex justify-between"><span className="text-gray-400">Hosting</span><span>{project.hosting_platform || '—'}</span></div>
          </div>
        </Card>
        <Card>
          <Title>Description</Title>
          <Text className="mt-2">{project.description || 'No description'}</Text>
        </Card>
      </div>
    </motion.div>
  );
}
