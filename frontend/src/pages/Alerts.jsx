import { useAlerts } from '../contexts/AlertContext';
import { Card, Title, Text } from '@tremor/react';
import { AlertTriangle } from 'lucide-react';

export default function Alerts() {
  const { downProjects } = useAlerts();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle size={24} className="text-red-500" />
        <h2 className="text-2xl font-bold">Critical Alerts</h2>
      </div>

      {downProjects.length === 0 ? (
        <Card>
          <Title>All systems operational</Title>
          <Text>No project is currently down.</Text>
        </Card>
      ) : (
        <div className="grid gap-4">
          {downProjects.map(p => (
            <Card key={p.project_id} decoration="left" decorationColor="red">
              <div className="flex justify-between items-start">
                <div>
                  <Title>Project #{p.project_id}</Title>
                  <Text className="text-red-400 font-medium">DOWN</Text>
                  <Text className="text-sm text-gray-400 mt-1">
                    Last checked: {new Date(p.checked_at).toLocaleString()}
                  </Text>
                </div>
                <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold">
                  OFFLINE
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
