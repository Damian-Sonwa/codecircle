import {useEffect, useMemo, useState, useRef} from 'react';
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
import {type Message} from '@/types';
import {cn} from '@/utils/styles';

const PrivateChatWindow = () => {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const typing = useChatStore((state) => state.typing);
  const {data: conversations} = useConversations();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [showOptions, setShowOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Prevent unmounting if conversation is temporarily missing (e.g., during refetch)
  const [lastKnownConversationId, setLastKnownConversationId] = useState<string | undefined>(activeConversationId);
  useEffect(() => {
    if (activeConversationId) {
      setLastKnownConversationId(activeConversationId);
    }
  }, [activeConversationId]);

  // Use stable conversation ID to prevent unmounting during refetch
  const stableConversationId = activeConversationId || lastKnownConversationId;

  // Fetch messages from API
  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useMessages(stableConversationId);
  const apiMessages = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  // Local state for instant message rendering (WhatsApp-like)
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // Sync API messages to local state when conversation changes or messages load
  useEffect(() => {
    if (apiMessages.length > 0) {
      setLocalMessages(apiMessages);
    } else if (!isLoading && stableConversationId) {
      // Clear messages when switching conversations
      setLocalMessages([]);
    }
  }, [stableConversationId, isLoading]);

  // Update local messages when API messages change (but don't overwrite optimistic updates)
  useEffect(() => {
    if (apiMessages.length > 0 && stableConversationId) {
      // Merge API messages with local messages, avoiding duplicates
      setLocalMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m._id));
        const newMessages = apiMessages.filter((m) => !existingIds.has(m._id));
        if (newMessages.length > 0) {
          // Sort by createdAt to maintain order
          const merged = [...prev, ...newMessages].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return merged;
        }
        return prev;
      });
    }
  }, [apiMessages, stableConversationId]);

  const conversation = useMemo(() => {
    if (!stableConversationId) return undefined;
    if (!conversations) return undefined;
    return conversations.find((item) => item._id === stableConversationId);
  }, [conversations, stableConversationId]);

  // Get the other participant (for DM conversations)
  const otherParticipantId = useMemo(() => {
    if (!conversation || conversation.type !== 'dm' || !user) return null;
    const currentUserId = user._id || user.userId || user.id;
    return conversation.participants.find((id) => id !== currentUserId) ?? null;
  }, [conversation, user]);

  const {data: otherUser} = useUserSummary(otherParticipantId ?? '', Boolean(otherParticipantId));
  const typingUsers = Object.entries(typing[stableConversationId ?? ''] ?? {}).filter(([, value]) => value);

  // Join conversation room
  useEffect(() => {
    if (!stableConversationId) return;
    const socket = getSocket();
    if (!socket) return;
    (socket as any).emit('conversation:join', {conversationId: stableConversationId});
    return () => {
      (socket as any).emit('conversation:leave', {conversationId: stableConversationId});
    };
  }, [stableConversationId]);

  // Listen for new messages via socket (instant updates)
  useEffect(() => {
    if (!stableConversationId) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      // Only add if it's for this conversation
      if (message.conversationId === stableConversationId) {
        setLocalMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m._id === message._id)) {
            return prev;
          }
          return [...prev, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    };

    const handleMessageUpdated = (message: Message) => {
      if (message.conversationId === stableConversationId) {
        setLocalMessages((prev) =>
          prev.map((m) => (m._id === message._id ? message : m))
        );
      }
    };

    const handleMessageDeleted = ({messageId, conversationId}: {messageId: string; conversationId: string}) => {
      if (conversationId === stableConversationId) {
        setLocalMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    };

    // Listen for optimistic message updates (sent by ChatInput)
    const handleOptimisticMessage = (event: CustomEvent<Message>) => {
      const message = event.detail;
      if (message.conversationId === stableConversationId) {
        setLocalMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m._id === message._id)) {
            return prev;
          }
          return [...prev, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleMessageUpdated);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('private:message', handleNewMessage); // Also listen to private:message for friend chats
    
    // Listen for optimistic updates
    window.addEventListener('message:sent', handleOptimisticMessage as EventListener);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleMessageUpdated);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('private:message', handleNewMessage);
      window.removeEventListener('message:sent', handleOptimisticMessage as EventListener);
    };
  }, [stableConversationId]);

  // Auto-scroll to bottom when new messages arrive (WhatsApp behavior)
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTo({
        top: messagesEndRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [localMessages]);

  // Mark messages as read
  useEffect(() => {
    if (!stableConversationId || !user) return;
    const socket = getSocket();
    if (!socket) return;
    const currentUserId = user._id || user.userId || user.id;
    const unread = localMessages.filter(
      (message) => message.senderId !== currentUserId && !message.readBy?.includes(currentUserId) && !message.deletedAt
    );
    if (unread.length > 0) {
      const ids = unread.map((message) => message._id);
      (socket as any).emit('read:ack', {conversationId: stableConversationId, messageIds: ids});
    }
  }, [localMessages, stableConversationId, user]);

  const handleReact = async (messageId: string, emoji: string) => {
    if (!stableConversationId) return;
    await api.post(endpoints.messageReactions(stableConversationId, messageId), {emoji});
    queryClient.invalidateQueries({queryKey: ['messages', stableConversationId]});
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

  // Safety check - don't render without a valid conversation ID
  if (!stableConversationId) {
    return (
      <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-sm px-4">
            <MessageSquare className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Select a friend to start chatting</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose a friend from the list to begin your conversation</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900">
        <div className="h-14 flex items-center px-4 border-b bg-white dark:bg-gray-800">
          <div className="animate-pulse flex items-center gap-3 w-full">
            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-700" />
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-200 dark:bg-gray-600 rounded" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Use local messages for rendering (instant updates)
  const messages = localMessages;

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900 min-h-0">
      {/* HEADER - Fixed at top */}
      <header className="h-14 flex items-center px-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white font-semibold text-base sm:text-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
              {displayStatus && (
                <div
                  className={cn(
                    'absolute bottom-0 right-0 h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-white dark:border-gray-800',
                    getStatusColor(displayStatus)
                  )}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{displayName}</h2>
              <div className="flex items-center gap-2">
                {typingUsers.length > 0 ? (
                  <p className="text-xs sm:text-sm text-sky-500 truncate">
                    {typingUsers.length === 1 ? 'Typing...' : `${typingUsers.length} typing...`}
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
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
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Voice call"
            >
              <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              title="Video call"
            >
              <Video className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                title="Options"
              >
                <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              {showOptions && (
                <motion.div
                  initial={{opacity: 0, y: -10}}
                  animate={{opacity: 1, y: 0}}
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-2 z-10"
                >
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <User className="h-4 w-4" />
                    View Profile
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <Shield className="h-4 w-4" />
                    Block User
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MESSAGE LIST - Fills middle, scrollable */}
      <div
        ref={messagesEndRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-3 bg-gray-50 dark:bg-gray-900 min-h-0"
      >
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto mb-4 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 px-4 py-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load previous messages'}
          </button>
        )}

        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-300 mb-2">Say hi 👋 to start the conversation</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Your messages are encrypted and secure</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            isOwn={message.senderId === (user?._id || user?.userId || user?.id)}
            onReact={(msg, emoji) => handleReact(msg._id, emoji)}
          />
        ))}
      </div>

      {/* INPUT AREA - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <ChatInput 
          conversationId={stableConversationId} 
          conversationType={conversation?.type === 'dm' ? 'private' : 'group'}
          targetUserId={otherParticipantId || undefined}
        />
      </div>
    </div>
  );
};

export default PrivateChatWindow;
