import {useQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';

export const usePresence = (userId?: string) =>
  useQuery({
    queryKey: ['presence', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const {data} = await api.get<{userId: string; status: string}>(endpoints.users.presence(userId!));
      return data;
    },
    refetchInterval: 15_000
  });


