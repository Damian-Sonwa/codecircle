import {useEffect, useMemo, useState} from 'react';
import {motion} from 'framer-motion';
import {useMessages} from '@/hooks/useMessages';
import {useConversations} from '@/hooks/useConversations';
import {useChatStore} from '@/store/chatStore';
import {useAuthStore} from '@/store/authStore';
import {MessageBubble} from './MessageBubble';
import {ChatInput} from './ChatInput';
import {getSocket} from '@/services/socket';
import {api, endpoints} from '@/services/api';
import {useQueryClient} from '@tanstack/react-query';
import {MoreVertical, User, Phone, Video, Shield, Circle, MessageSquare} from 'lucide-react';
import {useUserSummary} from '@/hooks/useUserSummary';
import {cn} from '@/utils/styles';

const PrivateChatWindow = () => {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const typing = useChatStore((state) => state.typing);
  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useMessages(activeConversationId);
  const {data: conversations} = useConversations();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [showOptions, setShowOptions] = useState(false);

  const messages = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const conversation = useMemo(
    () => conversations?.find((item) => item._id === activeConversationId),
    [conversations, activeConversationId]
  );

  // Get the other participant (for DM conversations)
  const otherParticipantId = useMemo(() => {
    if (!conversation || conversation.type !== 'dm' || !user) return null;
    // Try both _id and userId to handle different user object formats
    const currentUserId = user._id || user.userId || user.id;
    return conversation.participants.find((id) => id !== currentUserId) ?? null;
  }, [conversation, user]);

  const {data: otherUser} = useUserSummary(otherParticipantId ?? '', Boolean(otherParticipantId));
  const typingUsers = Object.entries(typing[activeConversationId ?? ''] ?? {}).filter(([, value]) => value);

  useEffect(() => {
    if (!activeConversationId) return;
    const socket = getSocket();
    if (!socket) return;
    (socket as any).emit('conversation:join', {conversationId: activeConversationId});
    return () => {
      (socket as any).emit('conversation:leave', {conversationId: activeConversationId});
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId || !user) return;
    const socket = getSocket();
    if (!socket) return;
    const currentUserId = user._id || user.userId || user.id;
    const unread = messages.filter(
      (message) => message.senderId !== currentUserId && !message.readBy?.includes(currentUserId) && !message.deletedAt
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

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-400';
      case 'away':
        return 'bg-yellow-400';
      default:
        return 'bg-slate-500';
    }
  };

  const displayName = conversation?.title ?? otherUser?.username ?? 'Unknown User';
  const displayStatus = otherUser?.status ?? 'offline';

  if (!activeConversationId) {
    return (
      <section className="flex flex-1 items-center justify-center">
        <div className="text-center max-w-sm">
          <MessageBubble
            message={{
              _id: 'placeholder',
              conversationId: '',
              senderId: '',
              content: 'Select a conversation to start chatting',
              media: [],
              reactions: {},
              deliveredTo: [],
              readBy: [],
              isPinned: false,
              isEncrypted: false,
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString()
            }}
            isOwn={false}
          />
          <p className="mt-4 text-sm text-slate-400">Choose a friend or start a new conversation</p>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="flex flex-1 flex-col min-h-0">
        <div className="glass-card mb-2 sm:mb-4 rounded-2xl sm:rounded-3xl p-3 sm:p-4">
          <div className="animate-pulse flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-700" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-slate-700 rounded mb-2" />
              <div className="h-3 w-24 bg-slate-800 rounded" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-400">Loading messages...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex flex-1 flex-col min-h-0">
      {/* Header */}
      <header className="glass-card mb-2 sm:mb-4 rounded-2xl sm:rounded-3xl p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primaryFrom to-primaryTo flex items-center justify-center text-white font-semibold text-base sm:text-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
              {displayStatus && (
                <div
                  className={cn(
                    'absolute bottom-0 right-0 h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-slate-900',
                    getStatusColor(displayStatus)
                  )}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-slate-100 truncate">{displayName}</h2>
              <div className="flex items-center gap-2">
                {typingUsers.length > 0 ? (
                  <p className="text-xs text-primaryTo truncate">
                    {typingUsers.length === 1 ? 'Typing...' : `${typingUsers.length} typing...`}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 truncate">
                    {displayStatus === 'online' ? (
                      <span className="flex items-center gap-1">
                        <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                        Online
                      </span>
                    ) : displayStatus === 'away' ? (
                      <span className="flex items-center gap-1">
                        <Circle className="h-2 w-2 fill-yellow-400 text-yellow-400" />
                        Away
                      </span>
                    ) : (
                      'Offline'
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 transition hover:border-primaryTo hover:text-primaryTo"
              title="Voice call"
            >
              <Phone className="h-4 w-4" />
            </button>
            <button
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 transition hover:border-primaryTo hover:text-primaryTo"
              title="Video call"
            >
              <Video className="h-4 w-4" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 transition hover:border-primaryTo hover:text-primaryTo"
                title="Options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {showOptions && (
                <motion.div
                  initial={{opacity: 0, y: -10}}
                  animate={{opacity: 1, y: 0}}
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-2 shadow-lift z-10"
                >
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800 transition">
                    <User className="h-4 w-4" />
                    View Profile
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-800 transition">
                    <Shield className="h-4 w-4" />
                    Block User
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Message Body */}
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
              <motion.div
                initial={{opacity: 0}}
                animate={{opacity: 1}}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <MessageSquare className="h-12 w-12 text-slate-500 mb-4" />
                <p className="text-sm font-medium text-slate-300 mb-2">Say hi 👋 to start the conversation</p>
                <p className="text-xs text-slate-500">Your messages are encrypted and secure</p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Input */}
      <ChatInput 
        conversationId={activeConversationId} 
        conversationType={conversation?.type === 'dm' ? 'private' : 'group'}
        targetUserId={otherParticipantId || undefined}
      />
    </section>
  );
};

export default PrivateChatWindow;

