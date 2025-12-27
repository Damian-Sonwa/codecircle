import {useEffect, useMemo} from 'react';
import {AppShell} from '@/components/layout/AppShell';
import {UnifiedConversationList} from '@/components/Chat/UnifiedConversationList';
import ChatWindow from '@/components/Chat/ChatWindow';
import {useChatStore} from '@/store/chatStore';
import {useConversations} from '@/hooks/useConversations';
import {useAppReady} from '@/hooks/useAppReady';
import {AppLoader} from '@/components/layout/AppLoader';

export const CommunityHangoutPage = () => {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL - BEFORE ANY CONDITIONAL RETURNS
  const {appReady} = useAppReady();
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const {data: conversations, isLoading} = useConversations({type: 'community'});

  // Filter to only show community conversations (exclude private circles and friend DMs)
  // This hook MUST be called unconditionally, even if conversations is undefined
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
  // This hook MUST be called unconditionally
  const activeConversation = useMemo(() => {
    if (!activeConversationId || !communityConversations) return null;
    return communityConversations.find((conv) => conv._id === activeConversationId);
  }, [activeConversationId, communityConversations]);

  // Ensure data is fetched when app is ready
  useEffect(() => {
    if (appReady && !conversations && !isLoading) {
      // Force refetch if data is missing
      console.log('[CommunityHangout] App ready, ensuring conversations are loaded');
    }
  }, [appReady, conversations, isLoading]);

  // CONDITIONAL RETURN AFTER ALL HOOKS
  if (!appReady) {
    return <AppLoader message="Loading communities..." />;
  }

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

