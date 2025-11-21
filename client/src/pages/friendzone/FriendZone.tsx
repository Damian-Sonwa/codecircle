import {Outlet, useLocation, useNavigate} from 'react-router-dom';
import {UserPlus, Users, MessageSquare, Bell} from 'lucide-react';
import {cn} from '@/utils/styles';

const tabs = [
  {id: 'requests', label: 'Requests', icon: UserPlus, path: '/friends/requests'},
  {id: 'friends', label: 'My Friends', icon: Users, path: '/friends/my-friends'},
  {id: 'chats', label: 'Chats', icon: MessageSquare, path: '/friends/chats'},
  {id: 'notifications', label: 'Notifications', icon: Bell, path: '/friends/notifications'}
];

export const FriendZone = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Determine active tab based on current path
  const activeTab = tabs.find((tab) => currentPath.startsWith(tab.path))?.id || 'requests';

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6 pb-8 sm:pb-14 pt-16 sm:pt-20 md:pt-24">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white">Friend Zone</h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">Manage your connections, chats, and friend-related notifications</p>
      </header>

      {/* Tab Navigation */}
      <div className="glass-card mb-6 sm:mb-8 rounded-2xl sm:rounded-3xl p-2 sm:p-3">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex items-center gap-2 rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all',
                  isActive
                    ? 'bg-gradient-to-r from-primaryFrom to-primaryTo text-white shadow-lift'
                    : 'bg-slate-900/60 text-slate-300 hover:bg-slate-900/80 hover:text-slate-100 border border-white/10'
                )}
              >
                <tab.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-page Content */}
      <div className="min-h-[400px]">
        <Outlet />
      </div>
    </div>
  );
};
