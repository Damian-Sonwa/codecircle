import {useEffect, useMemo, useState} from 'react';
import {motion} from 'framer-motion';
import {useMessages} from '@/hooks/useMessages';
import {useConversations} from '@/hooks/useConversations';
import {useChatStore} from '@/store/chatStore';
import {useAuthStore} from '@/store/authStore';
import {MessageBubble} from './MessageBubble';
import {ChatInput} from './ChatInput';
import {AddCircleMembers} from './AddCircleMembers';
import {getSocket} from '@/services/socket';
import {api, endpoints} from '@/services/api';
import {useQueryClient, useQuery} from '@tanstack/react-query';
import {UserPlus} from 'lucide-react';

const ChatWindow = () => {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const typing = useChatStore((state) => state.typing);
  const encryptionPreview = useChatStore((state) => state.encryptionPreview);
  const {data, fetchNextPage, hasNextPage, isFetchingNextPage} = useMessages(activeConversationId);
  const {data: conversations} = useConversations({type: 'all'});
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [showAddMembers, setShowAddMembers] = useState(false);

  const messages = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const conversation = useMemo(
    () => conversations?.find((item) => item._id === activeConversationId),
    [conversations, activeConversationId]
  );
  const typingUsers = Object.entries(typing[activeConversationId ?? ''] ?? {}).filter(([, value]) => value);

  // Fetch circle details if it's a private circle
  const {data: circleDetails} = useQuery({
    queryKey: ['private-circle', activeConversationId],
    queryFn: async () => {
      if (conversation?.conversationType !== 'private-circle') return null;
      const {data} = await api.get(endpoints.privateCircles.get(activeConversationId));
      return data;
    },
    enabled: conversation?.conversationType === 'private-circle' && Boolean(activeConversationId),
  });

  // Check if current user is admin
  const isAdmin = useMemo(() => {
    if (!circleDetails || !user) return false;
    const member = circleDetails.members?.find((m: any) => m.userId === user._id || m.userId === user.userId);
    return member?.role === 'admin';
  }, [circleDetails, user]);

  const currentMemberIds = useMemo(() => {
    return circleDetails?.members?.map((m: any) => m.userId) || [];
  }, [circleDetails]);

  useEffect(() => {
    if (!activeConversationId) return;
    const socket = getSocket();
    if (!socket) return;
    
    // Join appropriate room based on conversation type
    // If conversation is loaded, use its type; otherwise default to group join for community hangout
    if (conversation?.conversationType === 'private-circle') {
      (socket as any).emit('circle:join', {circleId: activeConversationId, userId: user?._id});
      return () => {
        // Socket.io will handle cleanup automatically
      };
    } else if (conversation?.conversationType === 'community' || conversation?.conversationType === 'room' || (conversation?.type === 'group' && conversation?.conversationType !== 'private-circle')) {
      // Community group - join group room
      const groupId = activeConversationId;
      (socket as any).emit('group:join', {groupId, userId: user?._id});
      return () => {
        // Socket.io will handle cleanup automatically
      };
    } else if (!conversation) {
      // If conversation not loaded yet, try group join (most common for community hangout)
      // This will be updated when conversation loads
      const groupId = activeConversationId;
      (socket as any).emit('group:join', {groupId, userId: user?._id});
      return () => {
        // Socket.io will handle cleanup automatically
      };
    } else {
      // Default fallback
      (socket as any).emit('conversation:join', {conversationId: activeConversationId});
      return () => {
        (socket as any).emit('conversation:leave', {conversationId: activeConversationId});
      };
    }
  }, [activeConversationId, conversation, user]);

  useEffect(() => {
    if (!activeConversationId || !user) return;
    const socket = getSocket();
    if (!socket) return;
    const unread = messages.filter(
      (message) =>
        message.senderId !== user._id &&
        !message.readBy?.includes(user._id) &&
        !message.deletedAt
    );
    if (unread.length > 0) {
      const ids = unread.map((message) => message._id);
      (socket as any).emit('read:ack', {conversationId: activeConversationId, messageIds: ids});
    }
  }, [messages, activeConversationId, user]);

  const handleReact = async (messageId: string, emoji: string) => {
    if (!activeConversationId) return;
    await api.post(endpoints.messageReactions(activeConversationId, messageId), {emoji});
    queryClient.invalidateQueries({queryKey: ['messages', activeConversationId]});
  };

  if (!activeConversationId) {
    return (
      <section className="flex flex-1 items-center justify-center">
        <p className="max-w-sm text-center text-sm text-slate-400">
          Select a conversation to start chatting. Your encrypted experience is on the horizon!
        </p>
      </section>
    );
  }

  return (
    <section className="relative flex flex-1 flex-col min-h-0">
      <header className="glass-card mb-2 sm:mb-4 rounded-2xl sm:rounded-3xl p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-slate-100 truncate">{conversation?.title ?? 'Conversation'}</h2>
              {conversation?.conversationType === 'private-circle' && isAdmin && (
                <button
                  onClick={() => setShowAddMembers(true)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 transition hover:border-primaryTo hover:text-primaryTo hover:scale-105"
                  title="Add members"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              )}
            </div>
            {typingUsers.length > 0 ? (
              <p className="text-xs text-primaryTo truncate">
                {typingUsers.length === 1 ? 'Someone is typing…' : `${typingUsers.length} people typing…`}
              </p>
            ) : (
              <p className="text-xs text-slate-400 hidden sm:block">
                {conversation?.conversationType === 'private-circle' 
                  ? `${circleDetails?.members?.length || 0} member${(circleDetails?.members?.length || 0) !== 1 ? 's' : ''}`
                  : 'Messages travel in near real-time via Socket.IO'}
              </p>
            )}
          </div>
          {encryptionPreview && (
            <span className="rounded-full bg-cyan-500/20 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-cyan-200 whitespace-nowrap flex-shrink-0">
              <span className="hidden sm:inline">Encryption preview active</span>
              <span className="sm:hidden">E2E</span>
            </span>
          )}
        </div>
      </header>
      {conversation?.conversationType === 'private-circle' && (
        <AddCircleMembers
          circleId={activeConversationId!}
          circleName={conversation.title || 'Circle'}
          isOpen={showAddMembers}
          onClose={() => setShowAddMembers(false)}
          currentMembers={currentMemberIds}
        />
      )}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-white/5 bg-slate-900/40 min-h-0">
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mx-auto mb-4 flex items-center justify-center rounded-full border border-white/10 px-3 sm:px-4 py-2 text-xs text-slate-400 transition hover:text-slate-200"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load previous messages'}
            </button>
          )}
          <div className="flex flex-col gap-2 sm:gap-3">
            {messages.map((message) => (
              <MessageBubble
                key={message._id}
                message={message}
                isOwn={message.senderId === user?._id}
                onReact={(msg, emoji) => handleReact(msg._id, emoji)}
              />
            ))}
            {messages.length === 0 && (
              <motion.p initial={{opacity: 0}} animate={{opacity: 1}} className="text-center text-xs sm:text-sm text-slate-500 px-2">
                Start the conversation with a glassy first message.
              </motion.p>
            )}
          </div>
        </div>
      </div>
      <ChatInput 
        conversationId={activeConversationId} 
        conversationType={
          conversation?.conversationType === 'private-circle' 
            ? 'private-circle' 
            : conversation?.conversationType === 'community' || conversation?.conversationType === 'room' || conversation?.type === 'group'
            ? 'group'
            : 'group'
        }
        groupId={
          conversation?.conversationType === 'community' || 
          conversation?.conversationType === 'room' || 
          (conversation?.type === 'group' && conversation?.conversationType !== 'private-circle') ||
          !conversation // Default to group if conversation not loaded yet (common for community hangout)
            ? activeConversationId 
            : undefined
        }
        circleId={conversation?.conversationType === 'private-circle' ? activeConversationId : undefined}
      />
    </section>
  );
};

export default ChatWindow;

