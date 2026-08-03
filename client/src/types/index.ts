export interface Project {
  id: string;
  name: string;
  ownerName?: string;
  ownerContact?: string;
  location?: string;
  status: 'active' | 'maintenance' | 'completed' | 'on-hold';
  hostingProvider?: string;
  deploymentMethod?: string;
  dbProvider?: string;
  dbHost?: string;
  dbName?: string;
  dbPort?: number;
  dbUser?: string;
  dbPassword?: string;
  dbConnectionString?: string;
  dbNotes?: string;
  gitRepoUrl?: string;
  liveUrl?: string;
  techStack?: string;
  version?: string;
  lastUpdated?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  projectId: string;
  amount: number;
  paymentDate: string;
  method?: string;
  notes?: string;
}
