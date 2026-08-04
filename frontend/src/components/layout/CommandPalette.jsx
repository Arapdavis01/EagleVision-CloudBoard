import { useState, useEffect, useRef } from 'react';
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

  const handleSelect = (id) => {
    navigate(`/projects/${id}`);
    setOpen(false);
    setQuery('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[20vh] z-50" onClick={() => setOpen(false)}>
      <div className="bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl p-4" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="w-full bg-transparent border-b border-gray-600 pb-2 outline-none text-white text-lg"
          placeholder="Search projects by name or client..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <ul className="mt-4 max-h-64 overflow-y-auto">
          {filtered.map(p => (
            <li
              key={p.id}
              className="p-2 hover:bg-gray-700 rounded cursor-pointer text-white flex justify-between"
              onClick={() => handleSelect(p.id)}
            >
              <span>{p.name}</span>
              <span className="text-gray-400">{p.client_name}</span>
            </li>
          ))}
          {filtered.length === 0 && <li className="p-2 text-gray-400">No projects found</li>}
        </ul>
      </div>
    </div>
  );
}
