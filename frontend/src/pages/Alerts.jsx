import { useAlerts } from '../contexts/AlertContext';

export default function Alerts() {
  const { downProjects } = useAlerts();
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Down Projects</h2>
      {downProjects.length === 0 ? (
        <div className="bg-gray-800 p-6 rounded-xl text-center text-gray-400">All systems operational.</div>
      ) : (
        <div className="space-y-3">
          {downProjects.map(p => (
            <div key={p.project_id} className="bg-red-900/30 border border-red-500 p-4 rounded-xl flex justify-between">
              <div>
                <p className="font-bold">Project #{p.project_id}</p>
                <p className="text-red-400">DOWN</p>
                <p className="text-sm text-gray-400">Last checked: {new Date(p.checked_at).toLocaleString()}</p>
              </div>
              <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold">OFFLINE</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
