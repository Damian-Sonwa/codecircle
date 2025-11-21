import {useQuery} from '@tanstack/react-query';
import {Crown} from 'lucide-react';
import {api, endpoints} from '@/services/api';

export const LeaderboardPage = () => {
  const {data: leaderboard = []} = useQuery({
    queryKey: ['knowledge-leaderboard-full'],
    queryFn: async () => {
      const {data} = await api.get(endpoints.knowledge.leaderboard);
      return data as Array<{userId: {_id: string; username: string; avatarUrl?: string; skills?: string[]; skillLevel?: string}; xp: number; badges: string[]; messagesSent: number; materialsShared: number; classesAttended: number}>;
    }
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 md:px-6 pb-8 sm:pb-14 pt-16 sm:pt-20 md:pt-24">
      <header className="flex flex-col items-center gap-3 sm:gap-4 rounded-2xl sm:rounded-[2rem] border border-white/10 bg-slate-900/60 p-4 sm:p-6 md:p-10 text-center shadow-glass">
        <Crown className="h-6 w-6 sm:h-8 sm:w-8 text-secondaryTo" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white">Community Leaderboard</h1>
        <p className="max-w-2xl text-xs sm:text-sm text-slate-300 px-2">
          Earn XP by sharing knowledge, attending classes, and supporting peers. Badges highlight your biggest strengths.
        </p>
      </header>

      <div className="mt-6 sm:mt-10 space-y-3 sm:space-y-4">
        {leaderboard.map((entry, index) => (
          <div key={entry.userId._id} className="glass-card flex flex-col gap-3 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 text-xs sm:text-sm text-slate-200 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xl font-semibold text-white">#{index + 1}</span>
              <div>
                <p className="font-semibold text-white">{entry.userId.username}</p>
                <p className="text-xs text-slate-400">{entry.userId.skillLevel ?? 'Explorer'} • {entry.userId.skills?.join(', ') ?? 'Tech Enthusiast'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
              <span>{entry.xp} XP</span>
              <span>{entry.messagesSent} msgs</span>
              <span>{entry.materialsShared} resources</span>
              <span>{entry.classesAttended} classes</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.25em] text-slate-400">
              {entry.badges.map((badge) => (
                <span key={badge} className="rounded-full border border-white/10 px-3 py-1">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        ))}
        {leaderboard.length === 0 && <p className="text-center text-sm text-slate-400">No leaderboard data yet. Start sharing to earn XP!</p>}
      </div>
    </div>
  );
};

