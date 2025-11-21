import {useQuery} from '@tanstack/react-query';
import {motion} from 'framer-motion';
import {Sparkles, Users, BookOpen, Trophy} from 'lucide-react';
import {useAuthStore} from '@/store/authStore';
import {api, endpoints} from '@/services/api';
import {type KnowledgePost} from '@/types';

export const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const {data: knowledge = []} = useQuery({
    queryKey: ['knowledge', {type: 'daily-bite'}],
    queryFn: async () => {
      const {data} = await api.get<KnowledgePost[]>(`${endpoints.knowledge.root}?type=daily-bite`);
      return data;
    }
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6 pb-8 sm:pb-14 pt-16 sm:pt-20 md:pt-24">
      <div className="rounded-2xl sm:rounded-[2.5rem] border border-white/10 bg-slate-900/60 p-4 sm:p-6 md:p-10 shadow-glass">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.5em] text-primaryTo">Welcome back</p>
        <h1 className="mt-2 sm:mt-3 text-xl sm:text-2xl md:text-3xl font-semibold text-white">{user?.username}, ready to learn &amp; collaborate?</h1>
        <p className="mt-2 max-w-xl text-xs sm:text-sm text-slate-300">
          Dive into communities that match your skills, catch live classes, and climb the leaderboard with every contribution.
        </p>
      </div>

      <div className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <motion.div
            key={card.title}
            whileHover={{y: -4}}
            className="glass-card rounded-3xl p-6"
          >
            <card.icon className="h-6 w-6 text-primaryTo" />
            <p className="mt-4 text-xs uppercase tracking-[0.35em] text-slate-400">{card.title}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-2 text-xs text-slate-400">{card.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 sm:mt-12 grid gap-6 sm:gap-8 lg:grid-cols-2">
        <section className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
          <h2 className="text-base sm:text-lg font-semibold text-white">Daily Tech Bite</h2>
          {knowledge.length > 0 ? (
            <article className="mt-4 rounded-3xl border border-white/10 bg-slate-900/50 p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{knowledge[0].title}</p>
              <p className="mt-3 text-sm text-slate-200">{knowledge[0].summary}</p>
              <p className="mt-4 text-xs text-slate-500">Tag: {knowledge[0].tags?.join(', ') || 'daily-bite'}</p>
            </article>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Refresh later for a new tech insight.</p>
          )}
        </section>
        <section className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
          <h2 className="text-base sm:text-lg font-semibold text-white">Next steps</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
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

