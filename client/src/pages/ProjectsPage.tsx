import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import ProjectTable from '../components/projects/ProjectTable';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search, page],
    queryFn: () =>
      api.get('/projects', { params: { search, page, limit: 25 } }).then(res => res.data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => navigate('/projects/new')}>
          <Plus size={16} className="mr-1" /> New
        </Button>
      </div>
      <div className="mb-4 max-w-xs">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      {isLoading ? <div>Loading...</div> : (
        <ProjectTable projects={data?.projects || []} />
      )}
      {data && (
        <div className="flex justify-between mt-4 text-sm text-gray-400">
          <span>Total: {data.total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>&laquo; Prev</button>
            <span>Page {page}</span>
            <button disabled={page * 25 >= data.total} onClick={() => setPage(p => p + 1)}>Next &raquo;</button>
          </div>
        </div>
      )}
    </div>
  );
}
