import {useQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {type UserSummary} from '@/types';

export const useUserSummary = (userId?: string, enabled = true) =>
  useQuery({
    queryKey: ['user-summary', userId],
    enabled: Boolean(userId && enabled),
    queryFn: async () => {
      const {data} = await api.get<UserSummary>(endpoints.users.summary(userId!));
      return data;
    }
  });

