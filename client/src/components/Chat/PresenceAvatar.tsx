import {type User} from '@/types';
import {cn} from '@/utils/styles';

interface Props {
  user: User;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14'
};

const skillPalette: Record<string, string> = {
  Fullstack: 'from-sky-500 to-sky-500',
  Backend: 'from-emerald-500 to-teal-400',
  Frontend: 'from-rose-500 to-orange-400',
  Cybersecurity: 'from-slate-500 to-cyan-500',
  'Data Science': 'from-amber-400 to-emerald-400',
  Cloud: 'from-blue-500 to-cyan-300',
  'UI/UX': 'from-pink-500 to-purple-400',
  'AI/ML': 'from-indigo-500 to-fuchsia-400'
};

export const PresenceAvatar = ({user, size = 'md'}: Props) => {
  const statusColor = user.status === 'online' ? 'bg-emerald-500' : user.status === 'away' ? 'bg-amber-400' : 'bg-slate-500';
  const primarySkill = user.skills?.[0] ?? 'Fullstack';
  const gradient = skillPalette[primarySkill] ?? 'from-sky-500 to-sky-500';
  return (
    <div className={cn('relative rounded-full bg-gradient-to-br p-[2px] shadow-[0_0_12px_rgba(99,102,241,0.45)]', `bg-gradient-to-br ${gradient}`, sizeMap[size])}>
      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-900">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.username} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="text-lg font-semibold text-slate-200">{user.username.at(0)?.toUpperCase()}</span>
        )}
      </div>
      <span className={cn('absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900', statusColor)} />
    </div>
  );
};


