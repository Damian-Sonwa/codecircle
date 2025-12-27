import {useQuery} from '@tanstack/react-query';
import {Bell, UserPlus, CheckCircle, UserMinus, MessageSquare, Clock} from 'lucide-react';
import {formatTimestamp} from '@/utils/date';

interface FriendNotification {
  _id: string;
  type: 'friend_request' | 'request_accepted' | 'unfriended' | 'new_chat';
  fromUser?: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  message: string;
  createdAt: string;
  read: boolean;
}

// Placeholder function - replace with actual API endpoint
const fetchFriendNotifications = async (): Promise<FriendNotification[]> => {
  // TODO: Replace with actual API call
  // const {data} = await api.get('/friends/notifications');
  // return data;
  
  // Mock data for now
  return [
    {
      _id: '1',
      type: 'friend_request',
      fromUser: {_id: '1', username: 'John Doe'},
      message: 'John Doe sent you a friend request',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      read: false
    },
    {
      _id: '2',
      type: 'request_accepted',
      fromUser: {_id: '2', username: 'Jane Smith'},
      message: 'Jane Smith accepted your friend request',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      read: true
    },
    {
      _id: '3',
      type: 'new_chat',
      fromUser: {_id: '3', username: 'Bob Wilson'},
      message: 'Bob Wilson sent you a message',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      read: false
    }
  ];
};

const getNotificationIcon = (type: FriendNotification['type']) => {
  switch (type) {
    case 'friend_request':
      return UserPlus;
    case 'request_accepted':
      return CheckCircle;
    case 'unfriended':
      return UserMinus;
    case 'new_chat':
      return MessageSquare;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: FriendNotification['type']) => {
  switch (type) {
    case 'friend_request':
      return 'text-sky-500 bg-sky-500/20';
    case 'request_accepted':
      return 'text-emerald-400 bg-emerald-400/20';
    case 'unfriended':
      return 'text-rose-400 bg-rose-400/20';
    case 'new_chat':
      return 'text-cyan-400 bg-cyan-400/20';
    default:
      return 'text-slate-400 bg-slate-400/20';
  }
};

export const FriendNotificationsPage = () => {
  const {data: notifications = [], isLoading} = useQuery({
    queryKey: ['friend-notifications'],
    queryFn: fetchFriendNotifications
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-400">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-sky-500" />
          <h2 className="text-lg sm:text-xl font-semibold text-white">Friend Notifications</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-sky-500/20 px-2.5 py-0.5 text-xs text-sky-500">{unreadCount} new</span>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
          <Bell className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-slate-500 mb-4" />
          <p className="text-sm sm:text-base text-slate-400">No notifications</p>
          <p className="text-xs text-slate-500 mt-2">Friend-related notifications will appear here</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const colorClass = getNotificationColor(notification.type);

            return (
              <div
                key={notification._id}
                className={`glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition ${
                  !notification.read ? 'border-l-4 border-sky-500' : ''
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={`rounded-full p-2 sm:p-2.5 ${colorClass} flex-shrink-0`}>
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm sm:text-base ${!notification.read ? 'font-semibold text-white' : 'text-slate-300'}`}>
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(notification.createdAt)}</span>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0 mt-2" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

