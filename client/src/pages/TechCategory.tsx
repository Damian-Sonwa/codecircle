import {useState, useMemo} from 'react';
import {motion} from 'framer-motion';
import {useQuery} from '@tanstack/react-query';
import {techGroupsAPI} from '@/lib/api';
import {useAuthStore} from '@/store/authStore';
import {useNotificationStore} from '@/store/notificationStore';
import {MessageSquare, Heart, TrendingUp, Users, Sparkles, Code, Brain, Rocket, Shield, Database, Palette} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {cn} from '@/utils/styles';

const categories = [
  {id: 'all', label: 'All', icon: Sparkles},
  {id: 'ai', label: 'AI', icon: Brain},
  {id: 'web', label: 'Web Dev', icon: Code},
  {id: 'mobile', label: 'Mobile', icon: Rocket},
  {id: 'startups', label: 'Startups', icon: TrendingUp},
  {id: 'cybersecurity', label: 'Security', icon: Shield},
  {id: 'data', label: 'Data', icon: Database},
  {id: 'design', label: 'Design', icon: Palette}
];

export const TechCategoryPage = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const pushNotification = useNotificationStore((state) => state.push);

  const {data: techGroups = [], isLoading} = useQuery({
    queryKey: ['tech-groups-category'],
    queryFn: async () => {
      const groups = await techGroupsAPI.list();
      return groups;
    }
  });

  const filteredGroups = useMemo(() => {
    if (activeCategory === 'all') return techGroups;
    return techGroups.filter((group) => {
      const topics = (group.topics || []).join(' ').toLowerCase();
      const name = (group.name || '').toLowerCase();
      const categoryLower = activeCategory.toLowerCase();
      return topics.includes(categoryLower) || name.includes(categoryLower);
    });
  }, [techGroups, activeCategory]);

  const handleJoin = async (groupId: string, groupName: string) => {
    if (!user) {
      pushNotification({
        id: 'join-error-auth',
        title: 'Authentication required',
        message: 'Please log in to join groups.'
      });
      return;
    }
    navigate(`/explore`);
  };

  const handleLike = (groupId: string) => {
    pushNotification({
      id: `like-${groupId}`,
      title: 'Like feature',
      message: 'Like functionality coming soon!'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="glass-card rounded-2xl sm:rounded-3xl p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-64 bg-slate-700 rounded" />
            <div className="h-4 w-96 bg-slate-800 rounded" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-6 w-3/4 bg-slate-700 rounded" />
                <div className="h-4 w-full bg-slate-800 rounded" />
                <div className="h-4 w-2/3 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tech</h1>
          <p className="text-sm sm:text-base text-slate-400">
            Trending conversations, insights, and builds in tech.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition',
                  isActive
                    ? 'bg-gradient-to-r from-primaryFrom to-primaryTo text-white shadow-lift'
                    : 'bg-slate-900/60 text-slate-300 border border-white/10 hover:border-primaryTo/40'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Feed */}
      {filteredGroups.length === 0 ? (
        <div className="glass-card rounded-2xl sm:rounded-3xl p-12 sm:p-16 text-center">
          <Sparkles className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-300 mb-2">No tech posts yet</p>
          <p className="text-sm text-slate-500 mb-6">Be the first to share insights!</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => navigate('/explore')}
              className="rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-6 py-3 text-sm font-semibold text-white shadow-lift transition hover:scale-105"
            >
              Create first post
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="rounded-full border border-white/10 bg-slate-900/60 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-primaryTo"
            >
              Follow tech creators
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <motion.div
              key={group._id}
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 transition hover:border-primaryTo/30 cursor-pointer"
              onClick={() => navigate(`/explore`)}
            >
              {/* Author & Topic */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primaryFrom to-primaryTo flex items-center justify-center text-white font-semibold text-sm">
                    {group.name?.charAt(0).toUpperCase() ?? 'T'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{group.name ?? 'Tech Group'}</p>
                    <p className="text-xs text-slate-400">
                      {group.topics?.slice(0, 2).join(', ') ?? 'Tech'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <p className="text-sm text-slate-300 mb-4 line-clamp-3">
                {group.description ?? 'Join this tech community to share insights and learn together.'}
              </p>

              {/* Engagement Metrics */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{group.members?.length ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{group.messageCount ?? 0}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLike(group._id);
                  }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition"
                >
                  <Heart className="h-4 w-4" />
                  <span>{group.likes ?? 0}</span>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};



