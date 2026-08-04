import React, { useState, useEffect, useRef } from 'react';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (open && projects.length === 0) {
      api.get('/projects').then(res => setProjects(res.data));
    }
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.client_name?.toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[20vh] z-50" onClick={() => setOpen(false)}>
      <div className="bg-gray-900 w-full max-w-lg rounded-xl shadow-2xl border border-white/10 p-4" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="w-full bg-transparent border-b border-gray-700 pb-2 outline-none text-white text-lg placeholder-gray-500"
          placeholder="Search projects..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <ul className="mt-4 max-h-64 overflow-y-auto space-y-1">
          {filtered.map(p => (
            <li
              key={p.id}
              className="p-3 hover:bg-white/5 rounded-lg cursor-pointer flex justify-between items-center"
              onClick={() => { navigate(`/projects/${p.id}`); setOpen(false); }}
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-gray-400 text-sm">{p.client_name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
