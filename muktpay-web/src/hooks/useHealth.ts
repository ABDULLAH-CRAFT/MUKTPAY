import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  database: 'up' | 'down';
  time: string;
}

export const useHealth = () =>
  useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get<HealthResponse>('/health')).data,
  });
