import {useMemo, useState} from 'react';
import {useConversations} from '@/hooks/useConversations';
import {useChatStore} from '@/store/chatStore';
import {useAuthStore} from '@/store/authStore';
import {cn} from '@/utils/styles';
import {formatTimestamp} from '@/utils/date';
import {Archive, Lock, PinIcon, Search, ShieldCheck, Users} from 'lucide-react';

interface Props {
  filter?: 'all' | 'dm' | 'group';
}

export const ConversationList = ({filter = 'all'}: Props) => {
  const {data, isLoading} = useConversations();
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);
  const user = useAuthStore((state) => state.user);
  const [query, setQuery] = useState('');

  const conversations = useMemo(() => {
    if (!data) return [];
    if (!query) return data;
    return data.filter((conversation) => conversation.title?.toLowerCase().includes(query.toLowerCase()));
  }, [data, query]);

  return (
    <aside className="glass-card flex h-full w-full flex-col p-3 sm:p-4 lg:w-80">
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-slate-100">Chats</h2>
        <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500" />
      </div>
      <div className="mb-3 sm:mb-4 flex items-center gap-2 rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900/60 px-2 sm:px-3 py-2">
        <Search className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 flex-shrink-0" />
        <input
          type="search"
          placeholder="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-transparent text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
        />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-2">
        {isLoading && <p className="text-sm text-slate-500">Loading conversations…</p>}
        {conversations
          ?.filter((conversation) => (filter === 'all' ? true : conversation.type === filter))
          .map((conversation) => {
          const isActive = conversation._id === activeConversationId;
          const isPinned = conversation.pinnedBy?.includes(user?._id ?? '');
          const isArchived = conversation.archivedBy?.includes(user?._id ?? '');
          return (
            <button
              key={conversation._id}
              onClick={() => {
                setActiveConversation(conversation._id);
                // Close sidebar on mobile after selecting conversation
                if (window.innerWidth < 1024) {
                  setSidebarOpen(false);
                }
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-xl sm:rounded-2xl border border-transparent bg-slate-900/50 px-2 sm:px-3 py-2 sm:py-3 text-left transition hover:border-sky-500/40',
                isActive ? 'border-sky-500/50 bg-slate-900/80' : ''
              )}
            >
              <div className="flex flex-col items-start gap-0.5 sm:gap-1 text-left min-w-0 flex-1">
                <p className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium text-slate-100 truncate w-full">
                  <span className="truncate">{conversation.title ?? (conversation.type === 'dm' ? 'Private conversation' : 'Group chat')}</span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    {conversation.type === 'dm' ? <Lock className="h-3 w-3 text-slate-400" /> : <Users className="h-3 w-3 text-sky-500" />}
                    {isPinned && <PinIcon className="h-3 w-3 text-violet-500" />}
                    {isArchived && <Archive className="h-3 w-3 text-slate-500" />}
                    {conversation.locked && <Lock className="h-3 w-3 text-rose-500" />}
                  </span>
                </p>
                <p className="text-[10px] sm:text-xs text-slate-400 truncate w-full">Updated {formatTimestamp(conversation.updatedAt)}</p>
              </div>
            </button>
          );
          })}
        {conversations?.filter((conversation) => (filter === 'all' ? true : conversation.type === filter)).length === 0 && !isLoading && (
          <p className="text-sm text-slate-500">No conversations yet.</p>
        )}
      </div>
    </aside>
  );
};

