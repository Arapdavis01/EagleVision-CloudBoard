import React from 'react';
import { useAlerts } from '../contexts/AlertContext';

export default function Alerts() {
  const { downProjects } = useAlerts();
  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Down Projects</h2>
      {downProjects.length === 0 ? (
        <div className="bg-gray-900/60 backdrop-blur-md border border-white/5 rounded-xl p-8 text-center">
          <span className="text-4xl">✅</span>
          <p className="mt-3 text-gray-400">All systems operational</p>
        </div>
      ) : (
        <div className="space-y-4">
          {downProjects.map(p => (
            <div key={p.project_id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">Project #{p.project_id}</p>
                <p className="text-red-400 font-medium">DOWN</p>
                <p className="text-sm text-gray-400 mt-1">Last checked: {new Date(p.checked_at).toLocaleString()}</p>
              </div>
              <span className="bg-red-500/20 text-red-400 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">
                Offline
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
