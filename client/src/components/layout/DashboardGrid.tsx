import React from 'react';
import { Card } from '../ui/card';
import { useDashboardStats } from '../../pages/DashboardPage'; // will be defined later

export default function DashboardGrid() {
  const { data, isLoading } = useDashboardStats();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <h3 className="text-sm text-gray-400">Total Projects</h3>
        <p className="text-2xl font-bold">{data?.totalProjects || 0}</p>
      </Card>
      <Card>
        <h3 className="text-sm text-gray-400">Active</h3>
        <p className="text-2xl font-bold text-green-400">{data?.activeProjects || 0}</p>
      </Card>
      <Card>
        <h3 className="text-sm text-gray-400">Total Paid</h3>
        <p className="text-2xl font-bold">Ksh {(data?.totalPaid || 0).toLocaleString()}</p>
      </Card>
      <Card className="col-span-1 md:col-span-2 lg:col-span-2">
        <h3 className="text-sm text-gray-400 mb-2">Recent Projects</h3>
        <ul className="space-y-1">
          {data?.recentProjects?.map((p: any) => (
            <li key={p.id} className="text-sm border-b border-gray-800 py-1 flex justify-between">
              <span>{p.name}</span>
              <span className="text-gray-500">{p.status}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
