import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface User {
  id: string;
  email: string;
}

export function useAuth() {
  return useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
    retry: false,
    staleTime: Infinity,
    enabled: !!localStorage.getItem('accessToken'), // only run if token exists
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await api.post('/auth/login', data);
      return res.data; // { user, accessToken }
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      queryClient.invalidateQueries(['auth']);
    },
  });
}

export function useVerify() {
  // Not used anymore, but keep empty to avoid import errors
  return useMutation({
    mutationFn: async () => {},
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      localStorage.removeItem('accessToken');
      queryClient.clear();
    },
  });
}
