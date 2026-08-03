import { useNavigate } from 'react-router-dom';
import { Table, Th, Td } from '../ui/table';
import { Badge } from '../ui/badge';
import type { Project } from '../../types';

interface Props {
  projects: Project[];
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  active: 'success',
  maintenance: 'warning',
  completed: 'info',
  'on-hold': 'danger',
};

export default function ProjectTable({ projects }: Props) {
  const navigate = useNavigate();

  return (
    <Table>
      <thead>
        <tr>
          <Th>Project</Th>
          <Th>Owner</Th>
          <Th>Status</Th>
          <Th>Hosting</Th>
          <Th>DB</Th>
          <Th>Location</Th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <tr
            key={project.id}
            className="cursor-pointer hover:bg-gray-800/50 transition-colors"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <Td className="font-medium text-brand-300">{project.name}</Td>
            <Td>{project.ownerName || '-'}</Td>
            <Td>
              <Badge variant={statusVariant[project.status] || 'default'}>
                {project.status}
              </Badge>
            </Td>
            <Td>{project.hostingProvider || '-'}</Td>
            <Td>{project.dbProvider || '-'}</Td>
            <Td>{project.location || '-'}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
