import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import type { Project } from '../../types';

interface Props {
  project?: Project; // if editing
}

export default function ProjectForm({ project }: Props) {
  const [form, setForm] = useState({
    name: '',
    ownerName: '',
    ownerContact: '',
    location: '',
    status: 'active',
    hostingProvider: '',
    deploymentMethod: '',
    dbProvider: '',
    dbHost: '',
    dbName: '',
    dbPort: '',
    dbUser: '',
    dbPassword: '',
    dbConnectionString: '',
    dbNotes: '',
    gitRepoUrl: '',
    liveUrl: '',
    techStack: '',
    version: '',
    notes: '',
  });

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        ownerName: project.ownerName || '',
        ownerContact: project.ownerContact || '',
        location: project.location || '',
        status: project.status || 'active',
        hostingProvider: project.hostingProvider || '',
        deploymentMethod: project.deploymentMethod || '',
        dbProvider: project.dbProvider || '',
        dbHost: project.dbHost || '',
        dbName: project.dbName || '',
        dbPort: project.dbPort?.toString() || '',
        dbUser: project.dbUser || '',
        dbPassword: project.dbPassword || '',
        dbConnectionString: project.dbConnectionString || '',
        dbNotes: project.dbNotes || '',
        gitRepoUrl: project.gitRepoUrl || '',
        liveUrl: project.liveUrl || '',
        techStack: project.techStack || '',
        version: project.version || '',
        notes: project.notes || '',
      });
    }
  }, [project]);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = { ...data, dbPort: parseInt(data.dbPort) || undefined };
      if (project) {
        return api.put(`/projects/${project.id}`, payload);
      }
      return api.post('/projects', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      navigate('/projects');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold">{project ? 'Edit Project' : 'New Project'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Project Name *</label>
          <Input name="name" value={form.name} onChange={handleChange} required />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Owner Name</label>
          <Input name="ownerName" value={form.ownerName} onChange={handleChange} />
        </div>
        {/* ... add all other fields similarly, grouping by category ... */}
      </div>
      <Button type="submit" disabled={mutation.isLoading}>
        {project ? 'Update' : 'Create'}
      </Button>
    </form>
  );
}
