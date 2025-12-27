import {useMemo, useState} from 'react';
import {motion} from 'framer-motion';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {useChatStore} from '@/store/chatStore';
import {useAuthStore} from '@/store/authStore';
import {useConversations} from '@/hooks/useConversations';
import {type UserSummary, type Conversation} from '@/types';
import {cn} from '@/utils/styles';
import {formatTimestamp} from '@/utils/date';
import {MessageSquare, Users, Search, Circle} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

interface Props {
  showSearch?: boolean;
}

export const FriendChatList = ({showSearch = true}: Props) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);
  const [query, setQuery] = useState('');

  // Fetch friends
  const {data: friendsData, isLoading: isLoadingFriends} = useQuery<{
    friends: UserSummary[];
    friendRequests: UserSummary[];
    sentFriendRequests: UserSummary[];
  }>({
    queryKey: ['friends'],
    queryFn: async () => {
      const {data} = await api.get(endpoints.users.friends);
      return data;
    },
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Fetch friend-only conversations
  const {data: conversations} = useConversations({type: 'friend'});

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (participantId: string) => {
      const {data} = await api.post<Conversation>(endpoints.conversations.create, {participantId});
      return data;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({queryKey: ['conversations']});
      setActiveConversation(conversation._id);
      navigate('/messages?type=private');
    },
  });

  const friends = friendsData?.friends ?? [];

  // Merge friends with their conversations
  const friendChats = useMemo(() => {
    const currentUserId = user?._id || user?.userId || user?.id;
    return friends.map((friend) => {
      // Find existing conversation with this friend
      // Backend uses userId, frontend might use _id - check both
      const friendId = friend._id || friend.userId || friend.id;
      const conversation = conversations?.find(
        (conv) => conv.type === 'dm' && 
        conv.participants.includes(friendId) &&
        conv.participants.includes(currentUserId)
      );

      return {
        friend,
        conversation,
        hasConversation: Boolean(conversation),
      };
    });
  }, [friends, conversations, user]);

  // Filter by search query
  const filteredChats = useMemo(() => {
    if (!query) return friendChats;
    const lowerQuery = query.toLowerCase();
    return friendChats.filter(({friend}) =>
      friend.username.toLowerCase().includes(lowerQuery)
    );
  }, [friendChats, query]);

  const handleStartChat = async (friend: UserSummary) => {
    const currentUserId = user?._id || user?.userId || user?.id;
    const friendId = friend._id || friend.userId || friend.id;
    
    // Find existing conversation
    const existingConversation = conversations?.find(
      (conv) => conv.type === 'dm' && 
      conv.participants.includes(friendId) &&
      conv.participants.includes(currentUserId)
    );

    if (existingConversation) {
      setActiveConversation(existingConversation._id);
      navigate('/messages?type=private');
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    } else {
      // Create new conversation - use friendId (backend expects userId)
      createConversationMutation.mutate(friendId);
    }
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

  if (isLoadingFriends) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl bg-slate-800/50 h-16" />
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-16 w-16 text-slate-500 mb-4" />
        <p className="text-base font-medium text-slate-300 mb-2">You haven't added any friends yet</p>
        <p className="text-sm text-slate-500 mb-6">Add friends to start chatting</p>
        <button
          onClick={() => navigate('/friends')}
          className="rounded-full bg-gradient-to-r from-sky-500 to-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-105"
        >
          Find Friends
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {showSearch && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <input
            type="search"
            placeholder="Search friends..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="h-12 w-12 text-slate-500 mb-4" />
            <p className="text-sm text-slate-400">No friends match your search</p>
          </div>
        ) : (
          filteredChats.map(({friend, conversation}) => {
            const isActive = conversation?._id === activeConversationId;
            const lastMessage = conversation?.lastMessage;
            const unreadCount = conversation?.unreadCount || 0;

            return (
              <motion.button
                key={friend._id}
                initial={{opacity: 0, y: 10}}
                animate={{opacity: 1, y: 0}}
                onClick={() => handleStartChat(friend)}
                disabled={createConversationMutation.isPending}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border border-transparent bg-slate-900/50 px-3 py-3 text-left transition hover:border-sky-500/40',
                  isActive ? 'border-sky-500/50 bg-slate-900/80' : '',
                  createConversationMutation.isPending ? 'opacity-50 cursor-wait' : ''
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center text-white font-semibold text-base">
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                  {friend.status && (
                    <div
                      className={cn(
                        'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900',
                        getStatusColor(friend.status)
                      )}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-white truncate">{friend.username}</p>
                    {lastMessage && (
                      <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                        {formatTimestamp(lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  {lastMessage ? (
                    <p className="text-xs text-slate-400 truncate">
                      {lastMessage.senderId === user?._id ? 'You: ' : `${lastMessage.senderName}: `}
                      {lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">No messages yet</p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <div className="flex-shrink-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-semibold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
};

