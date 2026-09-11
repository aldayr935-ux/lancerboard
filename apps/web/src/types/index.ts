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