import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { Card, Title, Metric, AreaChart } from '@tremor/react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const [stats, setStats] = useState({
    projects: 0,
    revenue: 0,
    uptimePercent: 0
  });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [projRes, finRes, uptRes] = await Promise.all([
          api.get('/projects'),
          api.get('/finance/sales'),
          api.get('/uptime/status')
        ]);
        const totalProjects = projRes.data.length;
        const totalRevenue = finRes.data.total || 0;
        const upCount = uptRes.data.filter(p => p.status === 'up').length;
        const uptimePercent = totalProjects ? (upCount / totalProjects) * 100 : 0;

        setStats({
          projects: totalProjects,
          revenue: totalRevenue,
          uptimePercent: Math.round(uptimePercent * 10) / 10  // one decimal, still number
        });
      } catch (err) {
        console.error('Dashboard fetch error', err);
      }
    }
    fetchStats();

    // Placeholder chart data
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

  const criticalAlerts = stats.projects - Math.round((stats.uptimePercent / 100) * stats.projects);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gray-800 border-gray-700" decoration="top" decorationColor="blue">
            <Title>Total Projects</Title>
            <Metric>{stats.projects}</Metric>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gray-800 border-gray-700" decoration="top" decorationColor="green">
            <Title>Total Revenue</Title>
            <Metric>{formatCurrency(stats.revenue)}</Metric>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gray-800 border-gray-700" decoration="top" decorationColor="indigo">
            <Title>Avg Uptime</Title>
            <Metric>{stats.uptimePercent}%</Metric>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card className="bg-gray-800 border-gray-700" decoration="top" decorationColor="red">
            <Title>Critical Alerts</Title>
            <Metric>{criticalAlerts}</Metric>
          </Card>
        </motion.div>
      </div>
      <Card className="bg-gray-800 border-gray-700">
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
