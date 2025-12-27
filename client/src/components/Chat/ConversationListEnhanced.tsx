import {useMemo, useState} from 'react';
import {motion} from 'framer-motion';
import {useConversations} from '@/hooks/useConversations';
import {useChatStore} from '@/store/chatStore';
import {useAuthStore} from '@/store/authStore';
import {cn} from '@/utils/styles';
import {formatTimestamp} from '@/utils/date';
import {Archive, Lock, PinIcon, Search, ShieldCheck, Users, MessageSquare, Plus} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

interface Props {
  filter?: 'all' | 'dm' | 'group';
  showSearch?: boolean;
  showNewChatButton?: boolean;
}

export const ConversationListEnhanced = ({filter = 'all', showSearch = true, showNewChatButton = false}: Props) => {
  const {data, isLoading, error} = useConversations();
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);
  const user = useAuthStore((state) => state.user);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const conversations = useMemo(() => {
    if (!data) return [];
    let filtered = data.filter((conversation) => (filter === 'all' ? true : conversation.type === filter));
    if (query) {
      filtered = filtered.filter((conversation) => conversation.title?.toLowerCase().includes(query.toLowerCase()));
    }
    return filtered;
  }, [data, filter, query]);

  const handleNewChat = () => {
    navigate('/friends');
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
        <h2 className="text-base sm:text-lg font-semibold text-slate-100">Messages</h2>
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
          <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500" />
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
            const isPinned = conversation.pinnedBy?.includes(user?._id ?? '');
            const isArchived = conversation.archivedBy?.includes(user?._id ?? '');
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
                  'flex w-full items-center justify-between rounded-xl sm:rounded-2xl border border-transparent bg-slate-900/50 px-2 sm:px-3 py-2 sm:py-3 text-left transition hover:border-sky-500/40',
                  isActive ? 'border-sky-500/50 bg-slate-900/80' : ''
                )}
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                      {conversation.title?.charAt(0).toUpperCase() ?? (conversation.type === 'dm' ? 'D' : 'G')}
                    </div>
                    {conversation.type === 'group' && (
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-900 border-2 border-slate-900 flex items-center justify-center">
                        <Users className="h-2.5 w-2.5 text-sky-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-0.5 sm:gap-1 text-left min-w-0 flex-1">
                    <div className="flex items-center gap-1 sm:gap-2 w-full">
                      <p className="text-xs sm:text-sm font-medium text-slate-100 truncate">
                        {conversation.title ?? (conversation.type === 'dm' ? 'Private conversation' : 'Group chat')}
                      </p>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        {conversation.type === 'dm' && <Lock className="h-3 w-3 text-slate-400" />}
                        {isPinned && <PinIcon className="h-3 w-3 text-violet-500" />}
                        {isArchived && <Archive className="h-3 w-3 text-slate-500" />}
                        {conversation.locked && <Lock className="h-3 w-3 text-rose-500" />}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 truncate w-full">
                      Updated {formatTimestamp(conversation.updatedAt)}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </aside>
  );
};



