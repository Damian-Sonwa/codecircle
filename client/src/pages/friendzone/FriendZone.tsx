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
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6 pb-4 sm:pb-8 pt-12 sm:pt-16">

      {/* Tab Navigation */}
      <div className="glass-card mb-4 sm:mb-6 rounded-2xl p-2 sm:p-3">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-3 text-base font-medium transition-all min-h-[44px] touch-manipulation',
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-sky-500 text-white shadow-lift'
                    : 'bg-slate-900/60 text-slate-300 hover:bg-slate-900/80 hover:text-slate-100 border border-white/10'
                )}
              >
                <tab.icon className="h-4 w-4" />
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
