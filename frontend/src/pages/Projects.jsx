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
      <h2 className="text-2xl font-bold mb-4">Projects</h2>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search..."
          className="pl-9 pr-4 py-2 bg-gray-800 rounded w-full md:w-64 text-sm"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
      </div>
      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <div className="flex items-center border-b border-gray-800 px-4 py-2 text-xs uppercase text-gray-400">
          <span className="flex-1">Name</span>
          <span className="w-40 hidden md:block">Client</span>
          <span className="w-32">Status</span>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {filtered.map(p => (
            <div key={p.id} className="flex items-center border-b border-gray-800 px-4 py-3 hover:bg-gray-800 cursor-pointer"
              onClick={() => navigate(`/projects/${p.id}`)}>
              <span className="flex-1 font-medium">{p.name}</span>
              <span className="w-40 hidden md:block text-gray-400">{p.client_name}</span>
              <span className="w-32"><StatusBadge status={p.liveStatus?.status} /></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
