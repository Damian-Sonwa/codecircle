import {AppShell} from '@/components/layout/AppShell';
import {UnifiedConversationList} from '@/components/Chat/UnifiedConversationList';
import ChatWindow from '@/components/Chat/ChatWindow';
import {useChatStore} from '@/store/chatStore';
import {useConversations} from '@/hooks/useConversations';
import {useMemo} from 'react';

export const CommunityHangoutPage = () => {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const {data: conversations} = useConversations({type: 'community'});

  // Filter to only show community conversations (exclude private circles and friend DMs)
  const communityConversations = useMemo(() => {
    if (!conversations) return [];
    return conversations.filter(
      (conv) =>
        conv.conversationType === 'community' ||
        conv.conversationType === 'room' ||
        (conv.type === 'group' && conv.conversationType !== 'private-circle')
    );
  }, [conversations]);

  // Determine which chat window to show
  const activeConversation = useMemo(() => {
    if (!activeConversationId || !communityConversations) return null;
    return communityConversations.find((conv) => conv._id === activeConversationId);
  }, [activeConversationId, communityConversations]);

  return (
    <AppShell
      sidebar={
        <div className="flex h-full flex-col">
          <div className="mb-4 px-4 pt-4">
            <h2 className="text-lg font-semibold text-white mb-1">Community Hangout</h2>
            <p className="text-xs text-slate-400">Group learning & communities</p>
          </div>
          <UnifiedConversationList showSearch showNewChatButton={false} />
        </div>
      }
      mainContent={activeConversationId ? <ChatWindow /> : undefined}
    />
  );
};

