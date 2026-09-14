export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  hourlyRate: string | null;
  clientId: string;
  createdAt: string;
}

export interface ClientWithProjects extends Client {
  projects: Project[];
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  projectId: string;
  createdAt: string;
}

export interface ProjectWithTasks extends Project {
  client: Client;
  tasks: Task[];
}

export interface Invoice {
  id: string;
  number: string;
  status: 'DRAFT' | 'SENT' | 'PAID';
  total: string;
  projectId: string;
  issuedAt: string;
  paidAt: string | null;
}

export interface TimeEntry {
  id: string;
  hours: string;
  date: string;
  note: string | null;
  billed: boolean;
  taskId: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  done: boolean;
  projectId: string;
  timeEntries: TimeEntry[];
  createdAt: string;
}