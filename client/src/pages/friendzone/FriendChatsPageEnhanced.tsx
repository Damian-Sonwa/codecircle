import {useState} from 'react';
import {motion} from 'framer-motion';
import {AppShell} from '@/components/layout/AppShell';
import {FriendChatList} from '@/components/Chat/FriendChatList';
import PrivateChatWindow from '@/components/Chat/PrivateChatWindow';
import {useQuery} from '@tanstack/react-query';
import {api, endpoints} from '@/services/api';
import {type UserSummary} from '@/types';
import {MessageSquare, Users, UserPlus} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useChatStore} from '@/store/chatStore';
import {cn} from '@/utils/styles';

type Tab = 'all' | 'friends' | 'requests';

export const FriendChatsPageEnhanced = () => {
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const navigate = useNavigate();
  const activeConversationId = useChatStore((state) => state.activeConversationId);

  const {data: friendsData, isLoading: isLoadingFriends} = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const {data} = await api.get<{friends: UserSummary[]; friendRequests: UserSummary[]; sentFriendRequests: UserSummary[]}>(
        endpoints.users.friends
      );
      return data;
    }
  });

  const friends = friendsData?.friends ?? [];
  const friendRequests = friendsData?.friendRequests ?? [];

  const tabs = [
    {id: 'friends' as Tab, label: 'Friends', icon: Users, count: friends.length},
    {id: 'requests' as Tab, label: 'Requests', icon: UserPlus, count: friendRequests.length}
  ];

  return (
    <div className="relative -mx-3 sm:-mx-4 md:-mx-6 -mb-8 sm:-mb-14 -mt-4" style={{minHeight: 'calc(100vh - 20rem)'}}>
      <div className="glass-card mb-4 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-1">Friend Zone</h2>
            <p className="text-xs sm:text-sm text-slate-400">Social & casual conversations</p>
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
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium transition relative',
                  isActive ? 'text-primaryTo' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-xs',
                      isActive ? 'bg-primaryTo/20 text-primaryTo' : 'bg-slate-700 text-slate-400'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primaryTo"
                    initial={false}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 min-h-[400px]">
        {activeTab === 'friends' && (
          <AppShell
            sidebar={<FriendChatList showSearch />}
            mainContent={activeConversationId ? <PrivateChatWindow /> : undefined}
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
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <UserPlus className="h-16 w-16 text-slate-500 mb-4" />
                <p className="text-base font-medium text-slate-300 mb-2">No pending requests</p>
                <p className="text-sm text-slate-500">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {friendRequests.map((request) => (
                  <div
                    key={request._id}
                    className="glass-card rounded-xl sm:rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primaryFrom to-primaryTo flex items-center justify-center text-white font-semibold">
                        {request.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{request.username}</p>
                        <p className="text-xs text-slate-400">Wants to be friends</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate('/friends/requests')}
                        className="rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-4 py-2 text-xs font-semibold text-white shadow-lift transition hover:scale-105"
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

