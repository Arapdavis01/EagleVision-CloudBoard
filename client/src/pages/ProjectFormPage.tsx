import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import ProjectForm from '../components/projects/ProjectForm';

export default function ProjectFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(res => res.data),
    enabled: isEdit,
  });

  if (isEdit && isLoading) return <div>Loading project...</div>;

  return <ProjectForm project={isEdit ? project : undefined} />;
}
