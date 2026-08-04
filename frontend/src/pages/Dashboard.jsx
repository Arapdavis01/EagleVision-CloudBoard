import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Card, Title, Metric, AreaChart } from '@tremor/react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState({ projects: 0, revenue: 0, uptime: 0 });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // Fetch number of projects
    api.get('/projects').then(res => setStats(prev => ({ ...prev, projects: res.data.length })));
    // Fetch total revenue
    api.get('/finance/sales').then(res => setStats(prev => ({ ...prev, revenue: res.data.total })));
    // Fetch uptime statuses
    api.get('/uptime/status').then(res => {
      const total = res.data.length;
      const up = res.data.filter(p => p.status === 'up').length;
      setStats(prev => ({ ...prev, uptime: total ? ((up / total) * 100).toFixed(1) : 0 }));
    });
    // Placeholder chart data (would come from /uptime/history endpoint)
    const now = new Date();
    const fakeData = Array.from({ length: 24 }, (_, i) => {
      const time = new Date(now - (23 - i) * 60 * 60000);
      return {
        time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        'Avg Response Time': Math.floor(Math.random() * 300 + 50),
      };
    });
    setChartData(fakeData);
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card decoration="top" decorationColor="blue">
            <Title>Total Projects</Title>
            <Metric>{stats.projects}</Metric>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card decoration="top" decorationColor="green">
            <Title>Total Revenue</Title>
            <Metric>{formatCurrency(stats.revenue)}</Metric>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card decoration="top" decorationColor="indigo">
            <Title>Avg Uptime</Title>
            <Metric>{stats.uptime}%</Metric>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card decoration="top" decorationColor="red">
            <Title>Critical Alerts</Title>
            <Metric>{stats.projects - Math.round(stats.uptime * stats.projects / 100)}</Metric>
          </Card>
        </motion.div>
      </div>
      <Card>
        <Title>System Response Time (Last 24h)</Title>
        <AreaChart
          data={chartData}
          index="time"
          categories={['Avg Response Time']}
          colors={['blue']}
          yAxisWidth={60}
        />
      </Card>
    </div>
  );
}
