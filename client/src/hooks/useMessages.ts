import {useInfiniteQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {type Message, type Paginated} from '@/types';

export const useMessages = (conversationId?: string) => {
  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    enabled: Boolean(conversationId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({pageParam}) => {
      if (!conversationId) {
        return {data: [], nextCursor: undefined} as Paginated<Message>;
      }
      const params = new URLSearchParams({limit: '30'});
      if (pageParam) params.append('cursor', pageParam);
      const {data} = await api.get<Paginated<Message>>(`${endpoints.messages(conversationId)}?${params.toString()}`);
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor
  });
};


