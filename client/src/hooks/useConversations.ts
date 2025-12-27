import {useQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {type Conversation} from '@/types';
import {useAuthStore} from '@/store/authStore';

interface UseConversationsOptions {
  type?: 'friend' | 'community' | 'private-circle' | 'all';
}

export const useConversations = (options?: UseConversationsOptions) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const {type = 'all'} = options || {};
  
  return useQuery({
    queryKey: ['conversations', type],
    queryFn: async () => {
      let url = endpoints.conversations.list;
      if (type === 'friend') {
        url = `${endpoints.conversations.list}?type=friend`;
      } else if (type === 'community') {
        url = `${endpoints.conversations.list}?type=community`;
      } else if (type === 'private-circle') {
        url = `${endpoints.conversations.list}?type=private-circle`;
      }
      const {data} = await api.get<Conversation[]>(url);
      return data;
    },
    enabled: Boolean(accessToken && user),
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
  });
};


