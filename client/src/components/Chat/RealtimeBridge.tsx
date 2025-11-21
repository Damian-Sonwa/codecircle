import {useEffect} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {getSocket} from '@/services/socket';
import {type Message, type Conversation} from '@/types';
import {useAuthStore} from '@/store/authStore';

export const RealtimeBridge = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const invalidateConversation = (conversationId: string) => {
      queryClient.invalidateQueries({queryKey: ['messages', conversationId]});
      queryClient.invalidateQueries({queryKey: ['conversations']});
    };

    const handleMessageEvent = (message: Message) => {
      invalidateConversation(message.conversationId);
    };

    const handleMessageDeleted = ({conversationId}: {messageId: string; conversationId: string}) => {
      invalidateConversation(conversationId);
    };

    const handleReaction = (_payload: {messageId: string; emoji: string; userId: string}) => {
      // Invalidate messages to refresh reactions
      queryClient.invalidateQueries({queryKey: ['messages']});
    };

    const handleReceipt = ({conversationId}: {conversationId: string; messageIds: string[]; userId: string}) => {
      invalidateConversation(conversationId);
    };

    const handleConversationCreated = (_conversation: Conversation) => {
      queryClient.invalidateQueries({queryKey: ['conversations']});
    };

    const handleConversationUpdated = (_conversation: Conversation) => {
      queryClient.invalidateQueries({queryKey: ['conversations']});
    };

    const handleConversationDeleted = ({conversationId}: {conversationId: string}) => {
      queryClient.invalidateQueries({queryKey: ['conversations']});
      queryClient.invalidateQueries({queryKey: ['messages', conversationId]});
    };

    socket.on('message:new', (message: any) => handleMessageEvent(message));
    socket.on('message:updated', (message: any) => handleMessageEvent(message));
    socket.on('message:deleted', (payload: any) => handleMessageDeleted(payload));
    socket.on('reaction:added', (payload: any) => handleReaction(payload));
    socket.on('reaction:removed', (payload: any) => handleReaction(payload));
    socket.on('delivery:receipt', (payload: any) => handleReceipt(payload));
    socket.on('read:receipt', (payload: any) => handleReceipt(payload));
    socket.on('conversation:created', (conversation: any) => handleConversationCreated(conversation));
    socket.on('conversation:updated', (conversation: any) => handleConversationUpdated(conversation));
    socket.on('conversation:deleted', (payload: any) => handleConversationDeleted(payload));

    return () => {
      socket.off('message:new');
      socket.off('message:updated');
      socket.off('message:deleted');
      socket.off('reaction:added');
      socket.off('reaction:removed');
      socket.off('delivery:receipt');
      socket.off('read:receipt');
      socket.off('conversation:created');
      socket.off('conversation:updated');
      socket.off('conversation:deleted');
    };
  }, [queryClient, accessToken]);

  return null;
};

