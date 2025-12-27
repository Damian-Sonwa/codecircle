import {useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {motion} from 'framer-motion';
import {Sparkles, Users, BookOpen, Trophy} from 'lucide-react';
import {useAuthStore} from '@/store/authStore';
import {useAppReady} from '@/hooks/useAppReady';
import {AppLoader} from '@/components/layout/AppLoader';
import {api, endpoints} from '@/services/api';
import {type KnowledgePost} from '@/types';

export const DashboardPage = () => {
  const {appReady} = useAppReady();
  const user = useAuthStore((state) => state.user);
  
  // Ensure data is fetched when app is ready
  const {data: knowledge = [], isLoading: isLoadingKnowledge, error: knowledgeError} = useQuery({
    queryKey: ['knowledge', {type: 'daily-bite'}],
    queryFn: async () => {
      try {
        console.log('[Dashboard] Fetching daily bite...');
        const {data} = await api.get<KnowledgePost[]>(`${endpoints.knowledge.root}?type=daily-bite`);
        console.log('[Dashboard] Received knowledge:', data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (err: any) {
        console.error('[Dashboard] Error fetching knowledge:', err);
        // Don't throw - daily bite is not critical for dashboard
        return [];
      }
    },
    enabled: appReady, // Only fetch when app is ready
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (appReady && !isLoadingKnowledge && !knowledge.length) {
      console.log('[Dashboard] App ready, knowledge data loaded');
    }
  }, [appReady, isLoadingKnowledge, knowledge]);

  if (!appReady) {
    return <AppLoader message="Loading dashboard..." />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6 pb-4 sm:pb-8 pt-12 sm:pt-16 md:pt-20">
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-glass">
        <p className="text-xs uppercase tracking-[0.3em] text-sky-500">Welcome back</p>
        <h1 className="mt-2 text-xl sm:text-2xl md:text-3xl font-semibold text-white">{user?.username}, ready to learn &amp; collaborate?</h1>
        <p className="mt-2 max-w-xl text-base text-slate-300">
          Dive into communities that match your skills, catch live classes, and climb the leaderboard with every contribution.
        </p>
      </div>

      <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <motion.div
            key={card.title}
            whileHover={{y: -4}}
            className="glass-card rounded-2xl p-4 sm:p-6"
          >
            <card.icon className="h-6 w-6 text-sky-500" />
            <p className="mt-3 text-xs uppercase tracking-[0.35em] text-slate-400">{card.title}</p>
            <p className="mt-2 text-xl sm:text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-2 text-sm text-slate-400">{card.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 sm:mt-6 grid gap-4 sm:gap-6 lg:grid-cols-2">
        <section className="glass-card rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Daily Tech Bite</h2>
          {knowledge.length > 0 ? (
            <article className="mt-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{knowledge[0].title}</p>
              <p className="mt-3 text-base text-slate-200">{knowledge[0].summary}</p>
              <p className="mt-3 text-sm text-slate-500">Tag: {knowledge[0].tags?.join(', ') || 'daily-bite'}</p>
            </article>
          ) : (
            <p className="mt-3 text-base text-slate-400">Refresh later for a new tech insight.</p>
          )}
        </section>
        <section className="glass-card rounded-2xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white">Next steps</h2>
          <ul className="mt-3 space-y-2 text-base text-slate-300">
            <li>• Join a skill-based community via the Explore menu.</li>
            <li>• RSVP to an upcoming class in the Classroom hub.</li>
            <li>• Invite a friend to collaborate on your learning goals.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

const cards = [
  {title: 'Skill Sync', value: 'Create or refine profile', description: 'Update your skills to unlock tailored groups.', icon: Sparkles},
  {title: 'Community', value: 'Connect with peers', description: 'Visit Explore to find new tech circles.', icon: Users},
  {title: 'Classroom', value: 'Join a live class', description: 'Check the Classroom hub for upcoming sessions.', icon: BookOpen},
  {title: 'Leaderboard', value: 'Earn XP', description: 'Share knowledge and climb the ranks.', icon: Trophy}
];

