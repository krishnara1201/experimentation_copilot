import { apiRequest } from './client';
import type { User } from '../types/api';

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export function registerUser(input: RegisterInput): Promise<User> {
  return apiRequest<User>('/api/auth/register', { method: 'POST', body: input, auth: false });
}

export function login(username: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams();
  form.set('username', username);
  form.set('password', password);
  return apiRequest<TokenResponse>('/api/auth/token', { method: 'POST', form, auth: false });
}
