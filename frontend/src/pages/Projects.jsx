import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import StatusBadge from '../components/uptime/StatusBadge';
import { Search } from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [filterText, setFilterText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/projects').then(res => setProjects(res.data));
  }, []);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(filterText.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold">Projects</h2>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
          />
        </div>
      </div>

      <div className="glass overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-white/5">
          <span className="col-span-5">Name</span>
          <span className="col-span-3 hidden md:block">Client</span>
          <span className="col-span-3 md:col-span-2">Status</span>
          <span className="col-span-2 hidden md:block">Latency</span>
        </div>
        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">No projects found.</div>
          )}
          {filtered.map(p => (
            <div
              key={p.id}
              className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/5 cursor-pointer transition-colors items-center"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div className="col-span-5">
                <p className="font-medium">{p.name}</p>
                {p.client_name && <p className="text-xs text-gray-400 md:hidden">{p.client_name}</p>}
              </div>
              <div className="col-span-3 hidden md:block text-gray-400">{p.client_name || '—'}</div>
              <div className="col-span-3 md:col-span-2"><StatusBadge status={p.liveStatus?.status} /></div>
              <div className="col-span-2 hidden md:block text-gray-400">
                {p.liveStatus?.latency ? `${p.liveStatus.latency}ms` : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
