import {useEffect, useMemo, useState, useRef} from 'react';
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
import {UserPlus, MessageSquare} from 'lucide-react';
import {useAppReady} from '@/hooks/useAppReady';

const ChatWindow = () => {
  const {appReady} = useAppReady();
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const typing = useChatStore((state) => state.typing);
  const encryptionPreview = useChatStore((state) => state.encryptionPreview);
  const {data, fetchNextPage, hasNextPage, isFetchingNextPage} = useMessages(activeConversationId);
  const {data: conversations} = useConversations({type: 'all'});
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [showAddMembers, setShowAddMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);
  const conversation = useMemo(
    () => conversations?.find((item) => item._id === activeConversationId),
    [conversations, activeConversationId]
  );
  const typingUsers = Object.entries(typing[activeConversationId ?? ''] ?? {}).filter(([, value]) => value);

  // Fetch circle details if it's a private circle - only when app is ready
  const {data: circleDetails} = useQuery({
    queryKey: ['private-circle', activeConversationId],
    queryFn: async () => {
      if (conversation?.conversationType !== 'private-circle') return null;
      const {data} = await api.get(endpoints.privateCircles.get(activeConversationId));
      return data;
    },
    enabled: appReady && conversation?.conversationType === 'private-circle' && Boolean(activeConversationId), // CRITICAL: Wait for appReady
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTo({
        top: messagesEndRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!activeConversationId) return;
    const socket = getSocket();
    if (!socket) return;
    
    // Join appropriate room based on conversation type
    if (conversation?.conversationType === 'private-circle') {
      (socket as any).emit('circle:join', {circleId: activeConversationId, userId: user?._id});
      return () => {
        // Socket.io will handle cleanup automatically
      };
    } else if (conversation?.conversationType === 'community' || conversation?.conversationType === 'room' || (conversation?.type === 'group' && conversation?.conversationType !== 'private-circle')) {
      const groupId = activeConversationId;
      (socket as any).emit('group:join', {groupId, userId: user?._id});
      return () => {
        // Socket.io will handle cleanup automatically
      };
    } else if (!conversation) {
      const groupId = activeConversationId;
      (socket as any).emit('group:join', {groupId, userId: user?._id});
      return () => {
        // Socket.io will handle cleanup automatically
      };
    } else {
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
      <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-sm px-4">
            <MessageSquare className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">Select a conversation</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose a conversation to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900 min-h-0">
      {/* HEADER - Fixed at top */}
      <header className="h-14 flex items-center px-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                {conversation?.title ?? 'Conversation'}
              </h2>
              {conversation?.conversationType === 'private-circle' && isAdmin && (
                <button
                  onClick={() => setShowAddMembers(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  title="Add members"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              )}
            </div>
            {typingUsers.length > 0 ? (
              <p className="text-sm text-sky-500 truncate">
                {typingUsers.length === 1 ? 'Someone is typing…' : `${typingUsers.length} people typing…`}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                {conversation?.conversationType === 'private-circle' 
                  ? `${circleDetails?.members?.length || 0} member${(circleDetails?.members?.length || 0) !== 1 ? 's' : ''}`
                  : 'Messages travel in near real-time'}
              </p>
            )}
          </div>
          {encryptionPreview && (
            <span className="rounded-full bg-sky-500/20 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-sky-600 dark:text-sky-400 whitespace-nowrap flex-shrink-0">
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

      {/* MESSAGE LIST - Fills middle, scrollable */}
      <div
        ref={messagesEndRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-3 bg-gray-50 dark:bg-gray-900 min-h-0"
      >
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-auto mb-4 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 text-base text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition min-h-[44px] touch-manipulation"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load previous messages'}
          </button>
        )}

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <p className="text-base font-medium text-gray-600 dark:text-gray-300 mb-2">
              Start the conversation
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Send a message to begin chatting
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            isOwn={message.senderId === (user?._id || user?.userId)}
            onReact={(msg, emoji) => handleReact(msg._id, emoji)}
          />
        ))}
      </div>

      {/* INPUT AREA - Fixed at bottom */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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
            !conversation
              ? activeConversationId 
              : undefined
          }
          circleId={conversation?.conversationType === 'private-circle' ? activeConversationId : undefined}
        />
      </div>
    </div>
  );
};

export default ChatWindow;
