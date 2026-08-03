import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import DashboardGrid from '../components/layout/DashboardGrid';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/stats').then(res => res.data),
  });
}

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <DashboardGrid />
    </div>
  );
}
