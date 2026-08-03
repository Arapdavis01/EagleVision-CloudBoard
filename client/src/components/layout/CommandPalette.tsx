import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { Search } from 'lucide-react';

export default function CommandPalette() {
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Listen for ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') setCommandPaletteOpen(false);
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setCommandPaletteOpen]);

  // Fetch search results
  const { data: projects } = useQuery({
    queryKey: ['command-search', query],
    queryFn: () => api.get('/projects', { params: { search: query, limit: 5 } }).then(res => res.data.projects),
    enabled: query.length > 0,
  });

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const handleSelect = (id: string) => {
    navigate(`/projects/${id}`);
    setCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center px-4 border-b border-gray-800">
          <Search size={16} className="text-gray-500 mr-2" />
          <input
            ref={inputRef}
            className="flex-1 py-3 bg-transparent text-gray-100 placeholder-gray-500 outline-none text-sm"
            placeholder="Search projects..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="text-xs text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded ml-2 hidden sm:inline">esc</kbd>
        </div>

        {projects && projects.length > 0 && (
          <div className="max-h-60 overflow-y-auto">
            {projects.map((project: any) => (
              <button
                key={project.id}
                onClick={() => handleSelect(project.id)}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-800 transition-colors flex items-center justify-between text-sm"
              >
                <span>{project.name}</span>
                <span className="text-gray-500 text-xs">{project.status}</span>
              </button>
            ))}
          </div>
        )}

        {query && projects?.length === 0 && (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">No projects found.</div>
        )}
      </div>
    </div>
  );
}
