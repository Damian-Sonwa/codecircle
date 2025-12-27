import {useQuery} from '@tanstack/react-query';
import {ShieldCheck} from 'lucide-react';
import {api, endpoints} from '@/services/api';
import {useAuthStore} from '@/store/authStore';
import {type EngagementMetric} from '@/types';
import {LiveSessionApplications} from '@/components/Admin/LiveSessionApplications';

type AdminAnalytics = {
  userCount: number;
  messageCount: number;
  leaderboard: EngagementMetric[];
};

export const AdminPage = () => {
  const user = useAuthStore((state) => state.user);
  const {data, error} = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const {data} = await api.get<AdminAnalytics>(endpoints.admin.analytics);
      return data;
    },
    enabled: user?.role === 'admin'
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 md:px-6 pb-8 sm:pb-14 pt-16 sm:pt-20 md:pt-24">
      <header className="flex flex-col items-center gap-3 sm:gap-4 rounded-2xl sm:rounded-[2rem] border border-white/10 bg-slate-900/60 p-4 sm:p-6 md:p-10 text-center shadow-glass">
        <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-sky-500" />
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white">Admin control room</h1>
        <p className="max-w-2xl text-xs sm:text-sm text-slate-300 px-2">
          Moderate communities, review analytics, and keep the space safe for developers to learn and collaborate.
        </p>
      </header>

      {user?.role !== 'admin' && <p className="mt-6 sm:mt-10 text-center text-xs sm:text-sm text-rose-400 px-4">You need admin privileges to view this dashboard.</p>}

      {user?.role === 'admin' && !error && data && (
        <>
          <div className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Members</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.userCount}</p>
            </div>
            <div className="glass-card rounded-3xl p-6 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Messages</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.messageCount}</p>
            </div>
            <div className="glass-card rounded-3xl p-6 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Top creator</p>
              <p className="mt-2 text-2xl font-semibold text-white">{data.leaderboard?.[0]?.userId?.username ?? 'N/A'}</p>
            </div>
          </div>

          <div className="mt-8 sm:mt-10">
            <h2 className="text-xl font-semibold text-white mb-4">Live Session Applications</h2>
            <LiveSessionApplications />
          </div>
        </>
      )}
    </div>
  );
};

