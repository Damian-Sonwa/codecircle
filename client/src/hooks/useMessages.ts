import {useInfiniteQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {type Message, type Paginated} from '@/types';
import {useAppReady} from '@/hooks/useAppReady';

export const useMessages = (conversationId?: string) => {
  const {appReady} = useAppReady();
  
  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    enabled: appReady && Boolean(conversationId), // CRITICAL: Wait for appReady AND conversationId
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


