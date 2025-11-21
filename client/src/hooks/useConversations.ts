import {useQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {type Conversation} from '@/types';
import {useAuthStore} from '@/store/authStore';

export const useConversations = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const {data} = await api.get<Conversation[]>(endpoints.conversations);
      return data;
    },
    enabled: Boolean(accessToken)
  });
};


