import {useMemo, useState} from 'react';
import {motion} from 'framer-motion';
import {useConversations} from '@/hooks/useConversations';
import {useChatStore} from '@/store/chatStore';
import {useAuthStore} from '@/store/authStore';
import {type Conversation} from '@/types';
import {cn} from '@/utils/styles';
import {formatTimestamp} from '@/utils/date';
import {Search, Users, Lock, MessageSquare, Plus, User} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

interface Props {
  showSearch?: boolean;
  showNewChatButton?: boolean;
}

export const UnifiedConversationList = ({showSearch = true, showNewChatButton = false}: Props) => {
  const navigate = useNavigate();
  const {data, isLoading, error} = useConversations();
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);
  const user = useAuthStore((state) => state.user);
  const [query, setQuery] = useState('');
  
  // Determine filter based on current route
  const currentPath = window.location.pathname;
  const filterType = currentPath.includes('community-hangout')
    ? 'community'
    : currentPath.includes('my-tech-circle')
    ? 'private-circle'
    : undefined;

  const conversations = useMemo(() => {
    if (!data) return [];
    let filtered = data;
    
    // Apply type filter based on route
    if (filterType === 'community') {
      filtered = filtered.filter(
        (conv) =>
          conv.conversationType === 'community' ||
          conv.conversationType === 'room' ||
          (conv.type === 'group' && conv.conversationType !== 'private-circle' && conv.conversationType !== 'friend')
      );
    } else if (filterType === 'private-circle') {
      filtered = filtered.filter((conv) => conv.conversationType === 'private-circle');
    }
    
    // Apply search query
    if (query) {
      filtered = filtered.filter((conv) =>
        conv.title?.toLowerCase().includes(query.toLowerCase())
      );
    }
    return filtered;
  }, [data, query, filterType]);

  const handleNewChat = () => {
    navigate('/friends');
  };

  const getConversationBadge = (conversation: Conversation) => {
    switch (conversation.conversationType) {
      case 'friend':
        return {icon: User, label: 'Friend', color: 'text-cyan-400'};
      case 'community':
        return {icon: Users, label: 'Community', color: 'text-sky-500'};
      case 'room':
        return {icon: MessageSquare, label: 'Room', color: 'text-emerald-400'};
      case 'private-circle':
        return {icon: Lock, label: 'Circle', color: 'text-purple-400'};
      default:
        return conversation.type === 'dm'
          ? {icon: Lock, label: 'DM', color: 'text-slate-400'}
          : {icon: Users, label: 'Group', color: 'text-sky-500'};
    }
  };

  if (error) {
    return (
      <aside className="glass-card flex h-full w-full flex-col p-3 sm:p-4 lg:w-80">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-rose-400">Failed to load conversations</p>
            <p className="mt-2 text-xs text-slate-500">Please try again later</p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="glass-card flex h-full w-full flex-col p-3 sm:p-4 lg:w-80">
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-slate-100">
          {filterType === 'community' ? 'Community Hangout' : filterType === 'private-circle' ? 'My Tech Circle' : 'Messages'}
        </h2>
        <div className="flex items-center gap-2">
          {showNewChatButton && (
            <button
              onClick={handleNewChat}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 text-slate-300 transition hover:border-sky-600 hover:text-sky-600"
              title="New conversation"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {showSearch && (
        <div className="mb-3 sm:mb-4 flex items-center gap-2 rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/60 px-2 sm:px-3 py-2">
          <Search className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
          <input
            type="search"
            placeholder="Search conversations..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      )}
      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-slate-800/50 h-16" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-sm font-medium text-slate-300 mb-2">No conversations yet</p>
            <p className="text-xs text-slate-500 mb-4">Start a new conversation to get started</p>
            {showNewChatButton && (
              <button
                onClick={handleNewChat}
                className="rounded-full bg-gradient-to-r from-sky-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-105"
              >
                Start a conversation
              </button>
            )}
          </div>
        ) : (
          conversations.map((conversation) => {
            const isActive = conversation._id === activeConversationId;
            const badge = getConversationBadge(conversation);
            const BadgeIcon = badge.icon;

            return (
              <motion.button
                key={conversation._id}
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                onClick={() => {
                  setActiveConversation(conversation._id);
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl sm:rounded-2xl border border-transparent bg-slate-900/50 px-2 sm:px-3 py-2 sm:py-3 text-left transition hover:border-sky-500/40',
                  isActive ? 'border-sky-500/50 bg-slate-900/80' : ''
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primaryFrom to-primaryTo flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                    {conversation.title?.charAt(0).toUpperCase() ?? (conversation.type === 'dm' ? 'D' : 'G')}
                  </div>
                  {conversation.conversationType === 'friend' && conversation.otherParticipant?.online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-slate-900" />
                  )}
                  {conversation.type === 'group' && (
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-900 border-2 border-slate-900 flex items-center justify-center">
                      <Users className="h-2.5 w-2.5 text-primaryTo" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-100 truncate">
                      {conversation.title ?? (conversation.type === 'dm' ? 'Private conversation' : 'Group chat')}
                    </p>
                    <BadgeIcon className={cn('h-3 w-3 flex-shrink-0', badge.color)} />
                    {conversation.unreadCount && conversation.unreadCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primaryTo text-[9px] font-semibold text-white flex-shrink-0">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage ? (
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                      {conversation.lastMessage.senderId === user?._id ? 'You: ' : ''}
                      {conversation.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-[10px] sm:text-xs text-slate-500">No messages yet</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {formatTimestamp(conversation.updatedAt)}
                  </p>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </aside>
  );
};



