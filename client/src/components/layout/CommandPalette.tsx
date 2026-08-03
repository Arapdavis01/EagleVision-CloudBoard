import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dialog, Combobox } from '@headlessui/react'; // or custom implementation
import { api } from '../../lib/api';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Listen for ⌘K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const { data: projects } = useQuery({
    queryKey: ['projects-search', query],
    queryFn: () => api.get(`/projects?search=${query}&limit=5`).then(res => res.data.projects),
    enabled: query.length > 0,
  });

  return (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="fixed inset-0 z-50 ...">
      <div className="flex min-h-full items-start justify-center pt-[20vh]">
        <Dialog.Panel className="w-full max-w-lg rounded-xl bg-gray-900 p-4 shadow-2xl">
          <Combobox>
            <Combobox.Input
              className="w-full bg-transparent text-white outline-none"
              placeholder="Search projects, commands..."
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <Combobox.Options className="mt-2 max-h-60 overflow-y-auto">
              {projects?.map((project: any) => (
                <Combobox.Option
                  key={project.id}
                  value={project}
                  className={({ active }) =>
                    `cursor-pointer p-2 rounded ${active ? 'bg-blue-600' : ''}`
                  }
                  onClick={() => {
                    navigate(`/projects/${project.id}`);
                    setIsOpen(false);
                  }}
                >
                  {project.name}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </Combobox>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
