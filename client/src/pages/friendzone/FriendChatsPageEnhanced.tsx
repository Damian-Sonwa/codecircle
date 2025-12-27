import {useState, useEffect, useRef} from 'react';
import {motion} from 'framer-motion';
import {AppShell} from '@/components/layout/AppShell';
import {FriendChatList} from '@/components/Chat/FriendChatList';
import PrivateChatWindow from '@/components/Chat/PrivateChatWindow';
import {useQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {type UserSummary} from '@/types';
import {MessageSquare, Users, UserPlus} from 'lucide-react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {useChatStore} from '@/store/chatStore';
import {useAuthStore} from '@/store/authStore';
import {useConversations} from '@/hooks/useConversations';
import {useAppReady} from '@/hooks/useAppReady';
import {AppLoader} from '@/components/layout/AppLoader';
import {cn} from '@/utils/styles';

type Tab = 'all' | 'friends' | 'requests';

export const FriendChatsPageEnhanced = () => {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const {appReady} = useAppReady();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const navigate = useNavigate();
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const hasProcessedUrlFriend = useRef(false);
  const {data: conversations, isLoading: isLoadingConversations} = useConversations({type: 'friend'});

  // Ensure data is fetched when app is ready
  const {data: friendsData, isLoading: isLoadingFriends} = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const {data} = await api.get<{friends: UserSummary[]; friendRequests: UserSummary[]; sentFriendRequests: UserSummary[]}>(
        endpoints.users.friends
      );
      return data;
    },
    enabled: appReady, // Only fetch when app is ready
  });

  const friends = friendsData?.friends ?? [];
  const friendRequests = friendsData?.friendRequests ?? [];
  const friendIdFromUrl = searchParams.get('friendId');

  // Handle opening chat from URL parameter (e.g., after accepting friend request)
  useEffect(() => {
    if (!friendIdFromUrl || hasProcessedUrlFriend.current) return;
    
    const currentUserId = user?._id || user?.userId || user?.id;
    if (!currentUserId) return;

    // Wait for conversations to load
    if (!conversations) return;

    // Find conversation with this friend
    const conversation = conversations.find(
      (conv) => conv.type === 'dm' && 
      conv.participants.includes(friendIdFromUrl) &&
      conv.participants.includes(currentUserId)
    );

    if (conversation) {
      // Set active conversation and mark as processed
      hasProcessedUrlFriend.current = true;
      setActiveConversation(conversation._id);
      // Clean up URL parameter after a brief delay to ensure state is set
      setTimeout(() => {
        navigate('/friends/chats', {replace: true});
      }, 100);
    } else {
      // If no conversation exists yet, wait a bit and retry once
      // This handles the case where conversation is still being created
      if (!hasProcessedUrlFriend.current) {
        setTimeout(() => {
          const retryConversation = conversations.find(
            (conv) => conv.type === 'dm' && 
            conv.participants.includes(friendIdFromUrl) &&
            conv.participants.includes(currentUserId)
          );
          if (retryConversation) {
            hasProcessedUrlFriend.current = true;
            setActiveConversation(retryConversation._id);
            navigate('/friends/chats', {replace: true});
          } else {
            // Mark as processed to avoid infinite loop
            hasProcessedUrlFriend.current = true;
          }
        }, 1000);
      }
    }
  }, [friendIdFromUrl, conversations, user, setActiveConversation, navigate]);

  useEffect(() => {
    if (appReady && !isLoadingFriends && !isLoadingConversations) {
      console.log('[FriendChats] App ready, friends and conversations loaded');
    }
  }, [appReady, isLoadingFriends, isLoadingConversations]);

  // Early return AFTER all hooks have been called
  if (!appReady) {
    return <AppLoader message="Loading friend chats..." />;
  }

  const tabs = [
    {id: 'friends' as Tab, label: 'Friends', icon: Users, count: friends.length},
    {id: 'requests' as Tab, label: 'Requests', icon: UserPlus, count: friendRequests.length}
  ];

  return (
    <div className="relative -mx-3 sm:-mx-4 md:-mx-6 -mb-4 sm:-mb-8 -mt-4" style={{minHeight: 'calc(100vh - 20rem)'}}>
      <div className="glass-card mb-3 rounded-2xl p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Friend Zone</h2>
            <p className="text-sm text-slate-400">Social & casual conversations</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-base font-medium transition relative min-h-[44px] touch-manipulation',
                  isActive ? 'text-sky-500' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={cn(
                      'rounded-lg px-2 py-1 text-sm',
                      isActive ? 'bg-sky-500/20 text-sky-500' : 'bg-slate-700 text-slate-400'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"
                    initial={false}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 min-h-[400px]">
        {activeTab === 'friends' && (
          <AppShell
            sidebar={<FriendChatList showSearch />}
            mainContent={
              activeConversationId ? (
                <PrivateChatWindow key={activeConversationId} />
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-center max-w-sm px-4">
                    <MessageSquare className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                    <p className="text-base font-medium text-slate-300 mb-2">Select a friend to start chatting</p>
                    <p className="text-sm text-slate-500">Choose a friend from the list to begin your conversation</p>
                  </div>
                </div>
              )
            }
          />
        )}

        {activeTab === 'requests' && (
          <div>
            {isLoadingFriends ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse rounded-xl bg-slate-800/50 h-20" />
                ))}
              </div>
            ) : friendRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <UserPlus className="h-16 w-16 text-slate-500 mb-4" />
                <p className="text-base font-medium text-slate-300 mb-2">No pending requests</p>
                <p className="text-sm text-slate-500">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {friendRequests.map((request) => (
                  <div
                    key={request._id}
                    className="glass-card rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-sky-500 to-sky-500 flex items-center justify-center text-white font-semibold text-base">
                        {request.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-semibold text-white">{request.username}</p>
                        <p className="text-sm text-slate-400">Wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate('/friends/requests')}
                        className="rounded-lg bg-gradient-to-r from-sky-500 to-sky-500 px-4 py-3 text-base font-semibold text-white shadow-lift transition hover:bg-sky-600 hover:scale-105 min-h-[44px] touch-manipulation"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

