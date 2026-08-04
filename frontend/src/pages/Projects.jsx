import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import api from '../lib/api';
import StatusBadge from '../components/uptime/StatusBadge';
import { Search, Filter } from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/projects').then(res => setProjects(res.data));
  }, []);

  const filtered = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(filterText.toLowerCase()) ||
                          p.client_name?.toLowerCase().includes(filterText.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const Row = ({ index, style }) => {
    const p = filtered[index];
    return (
      <div
        style={style}
        className="flex items-center border-b border-gray-800 px-4 py-2 text-sm hover:bg-gray-800/50 cursor-pointer"
        onClick={() => navigate(`/projects/${p.id}`)}
      >
        <span className="flex-1 font-medium">{p.name}</span>
        <span className="w-40 hidden md:block text-gray-400">{p.client_name}</span>
        <span className="w-32"><StatusBadge status={p.liveStatus?.status} /></span>
        <span className="w-20 text-right">{p.liveStatus?.latency ? `${p.liveStatus.latency}ms` : '—'}</span>
      </div>
    );
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Projects</h2>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-9 pr-4 py-2 bg-gray-800 rounded text-sm w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
            />
          </div>
          <select
            className="bg-gray-800 rounded px-3 py-2 text-sm focus:outline-none"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden">
        <div className="flex items-center border-b border-gray-800 px-4 py-2 font-medium text-xs uppercase text-gray-400">
          <span className="flex-1">Name</span>
          <span className="w-40 hidden md:block">Client</span>
          <span className="w-32">Status</span>
          <span className="w-20 text-right">Latency</span>
        </div>

        {filtered.length > 0 ? (
          <List height={600} itemCount={filtered.length} itemSize={52} width="100%">
            {Row}
          </List>
        ) : (
          <div className="p-8 text-center text-gray-400">No projects match your filters.</div>
        )}
      </div>
    </div>
  );
}
