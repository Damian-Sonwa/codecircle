import {useSearchParams} from 'react-router-dom';
import {AppShell} from '@/components/layout/AppShell';
import {UnifiedConversationList} from '@/components/Chat/UnifiedConversationList';
import PrivateChatWindow from '@/components/Chat/PrivateChatWindow';
import ChatWindow from '@/components/Chat/ChatWindow';
import {useChatStore} from '@/store/chatStore';
import {useConversations} from '@/hooks/useConversations';
import {useMemo} from 'react';

export const ChatPage = () => {
  const [params] = useSearchParams();
  const typeParam = params.get('type');
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const {data: conversations} = useConversations();

  // Determine which chat window to show based on conversation type
  const activeConversation = useMemo(() => {
    if (!activeConversationId || !conversations) return null;
    return conversations.find((conv) => conv._id === activeConversationId);
  }, [activeConversationId, conversations]);

  // Use PrivateChatWindow for DM conversations, ChatWindow for groups
  const chatComponent = activeConversation?.type === 'dm' ? <PrivateChatWindow /> : <ChatWindow />;

  return (
    <AppShell
      sidebar={<UnifiedConversationList showSearch showNewChatButton />}
      mainContent={activeConversationId ? chatComponent : undefined}
    />
  );
};


