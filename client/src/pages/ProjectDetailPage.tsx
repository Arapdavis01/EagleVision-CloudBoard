import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { CredentialReveal } from '../components/projects/CredentialReveal';
import { Badge } from '../components/ui/badge';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(res => res.data),
  });

  if (isLoading) return <div>Loading...</div>;
  if (!project) return <div>Project not found.</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <Button variant="outline" onClick={() => navigate(`/projects/${id}/edit`)}>Edit</Button>
      </div>

      <Card className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-400">Status:</span>
          <span><Badge variant="info">{project.status}</Badge></span>
          <span className="text-gray-400">Owner:</span>
          <span>{project.ownerName} ({project.ownerContact})</span>
          <span className="text-gray-400">Location:</span>
          <span>{project.location}</span>
          <span className="text-gray-400">Hosting:</span>
          <span>{project.hostingProvider} - {project.deploymentMethod}</span>
          <span className="text-gray-400">DB Provider:</span>
          <span>{project.dbProvider}</span>
        </div>

        <div className="border-t border-gray-800 pt-3 mt-3">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Database Credentials</h3>
          <CredentialReveal label="Host" value={project.dbHost} />
          <CredentialReveal label="Name" value={project.dbName} />
          <CredentialReveal label="User" value={project.dbUser} />
          <CredentialReveal label="Password" value={project.dbPassword} />
          <CredentialReveal label="Connection String" value={project.dbConnectionString} />
        </div>

        {project.payments?.length > 0 && (
          <div className="border-t border-gray-800 pt-3">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Payments</h3>
            <ul className="space-y-1">
              {project.payments.map((p: any) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span>{new Date(p.paymentDate).toLocaleDateString()}</span>
                  <span>Ksh {p.amount.toLocaleString()}</span>
                  <span className="text-gray-500">{p.method}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">Live Site</Button>
            </a>
          )}
          {project.gitRepoUrl && (
            <a href={project.gitRepoUrl} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">Repository</Button>
            </a>
          )}
        </div>
      </Card>
    </div>
  );
}
