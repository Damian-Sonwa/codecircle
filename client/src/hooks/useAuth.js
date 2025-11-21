import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../lib/api';
import { useAuth as useAuthContext } from '../contexts/AuthContext';

export const useAuthMutation = () => {
  const queryClient = useQueryClient();
  const { login: setAuth } = useAuthContext();

  const loginMutation = useMutation({
    mutationFn: ({ username, password }) => authAPI.login(username, password),
    onSuccess: (data) => {
      setAuth(data);
      queryClient.setQueryData(['auth'], data);
    },
  });

  const registerMutation = useMutation({
    mutationFn: ({ username, password }) => authAPI.register(username, password),
    onSuccess: (data) => {
      setAuth(data);
      queryClient.setQueryData(['auth'], data);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authAPI.logout(),
    onSuccess: () => {
      queryClient.setQueryData(['auth'], null);
    },
  });

  return {
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoading: loginMutation.isPending || registerMutation.isPending,
    error: loginMutation.error || registerMutation.error,
  };
};





