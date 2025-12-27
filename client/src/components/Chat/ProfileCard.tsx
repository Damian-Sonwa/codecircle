import {useAuthStore} from '@/store/authStore';
import {useUIStore} from '@/store/uiStore';
import {PresenceAvatar} from './PresenceAvatar';
import {formatLastSeen} from '@/utils/date';
import {MoonStar, Sun, Sparkles, Share2, UserPlus} from 'lucide-react';
import {useNotificationStore} from '@/store/notificationStore';

export const ProfileCard = () => {
  const user = useAuthStore((state) => state.user);
  const pushNotification = useNotificationStore((state) => state.push);
  // Use separate selectors to avoid creating new objects on every render
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);

  if (!user) return null;

  return (
    <div className="glass-card flex items-center justify-between rounded-2xl sm:rounded-3xl p-3 sm:p-4 gap-2 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <PresenceAvatar user={user} />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold text-slate-100 truncate">{user.username}</p>
          <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Last seen {formatLastSeen(user.lastSeen)}</p>
          <div className="mt-1 sm:mt-2 flex flex-wrap gap-1 sm:gap-2 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-500">
            {user.skills?.slice(0, 2).map((skill) => (
              <span key={skill} className="rounded-full border border-white/10 px-2 sm:px-3 py-0.5 sm:py-1 text-slate-300">
                {skill}
              </span>
            ))}
            {user.skills && user.skills.length > 2 && (
              <span className="rounded-full border border-white/10 px-2 sm:px-3 py-0.5 sm:py-1 text-slate-300">
                +{user.skills.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="rounded-full border border-white/10 bg-slate-900/70 p-1.5 sm:p-2 text-slate-200 transition hover:text-sky-600"
        >
          {theme === 'light' ? <Sun className="h-3 w-3 sm:h-4 sm:w-4" /> : <MoonStar className="h-3 w-3 sm:h-4 sm:w-4" />}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-full border border-white/10 bg-slate-900/70 p-1.5 sm:p-2 text-slate-200 transition hover:text-sky-600"
        >
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
        <button
          onClick={() => pushNotification({id: `share-${Date.now()}`, title: 'Invite friends', message: 'Visit Friends & Invites to share your unique link.'})}
          className="rounded-full border border-white/10 bg-slate-900/70 p-1.5 sm:p-2 text-slate-200 transition hover:text-primaryTo hidden sm:flex"
        >
          <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
        <button
          onClick={() => pushNotification({id: `mentor-${Date.now()}`, title: 'Mentor mode', message: 'Update your profile to offer mentorship to peers.'})}
          className="rounded-full border border-white/10 bg-slate-900/70 p-1.5 sm:p-2 text-slate-200 transition hover:text-primaryTo hidden sm:flex"
        >
          <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
        </button>
      </div>
    </div>
  );
};


