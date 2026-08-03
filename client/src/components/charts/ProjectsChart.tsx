import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/card';

interface DataItem {
  name: string;
  value: number;
}

export default function ProjectsChart({ data }: { data: DataItem[] }) {
  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];
  return (
    <Card>
      <h3 className="text-sm text-gray-400 mb-2">Projects by Status</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
