import {useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Users, MessageSquare} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {api, endpoints} from '@/services/api';
import {type UserSummary} from '@/types';
import {useChatStore} from '@/store/chatStore';
import {useConversations} from '@/hooks/useConversations';
import {useAppReady} from '@/hooks/useAppReady';
import {AppLoader} from '@/components/layout/AppLoader';

export const MyFriendsPage = () => {
  const {appReady} = useAppReady();
  const navigate = useNavigate();
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const {data: conversations} = useConversations();

  const {data, isLoading} = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const {data} = await api.get<{friends: UserSummary[]; requests: UserSummary[]}>(endpoints.users.friends);
      return data;
    },
    enabled: appReady, // Only fetch when app is ready
    refetchOnMount: true,
  });

  useEffect(() => {
    if (appReady && !isLoading && data) {
      console.log('[MyFriends] App ready, friends data loaded');
    }
  }, [appReady, isLoading, data]);

  if (!appReady) {
    return <AppLoader message="Loading friends..." />;
  }

  const handleStartChat = (friend: UserSummary) => {
    // Find existing DM conversation with this friend
    const existingConversation = conversations?.find(
      (conv) => conv.type === 'dm' && conv.participants.includes(friend._id)
    );

    if (existingConversation) {
      // Navigate to chats and set active conversation
      setActiveConversation(existingConversation._id);
      navigate('/friends/chats');
    } else {
      // TODO: Create new conversation and then navigate
      // For now, just navigate to chats page
      navigate('/friends/chats');
      // You might want to show a notification to create conversation first
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400">Loading friends...</p>
      </div>
    );
  }

  const friends = data?.friends ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-sky-500" />
          <h2 className="text-lg sm:text-xl font-semibold text-white">My Friends</h2>
          <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-300">{friends.length}</span>
        </div>
      </div>

      {friends.length === 0 ? (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
          <Users className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-slate-500 mb-4" />
          <p className="text-sm sm:text-base text-slate-400 mb-2">No friends yet</p>
          <p className="text-xs text-slate-500">Start by sending friend requests or accepting incoming requests</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {friends.map((friend) => (
            <div
              key={friend._id}
              className="glass-card group rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition hover:border-sky-500/30 cursor-pointer"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center text-white font-semibold text-base sm:text-lg">
                    {friend.username.charAt(0).toUpperCase()}
                  </div>
                  {friend.status && (
                    <div className={`absolute bottom-0 right-0 h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-slate-900 ${getStatusColor(friend.status)}`} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm sm:text-base font-semibold text-white truncate">{friend.username}</p>
                    {friend.status === 'online' && (
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wide">Online</span>
                    )}
                  </div>
                  {friend.skillLevel && (
                    <p className="text-xs text-slate-400 mt-0.5">{friend.skillLevel}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {friend.skills?.slice(0, 3).map((skill) => (
                      <span key={skill} className="text-[10px] sm:text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded-full">
                        {skill}
                      </span>
                    ))}
                    {friend.skills && friend.skills.length > 3 && (
                      <span className="text-[10px] sm:text-xs text-slate-400">+{friend.skills.length - 3}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleStartChat(friend)}
                  className="flex-1 rounded-full bg-gradient-to-r from-sky-500 to-sky-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-105 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                  Chat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

