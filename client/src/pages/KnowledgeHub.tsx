import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Heart, Bookmark, MessageCircle, BookOpen} from 'lucide-react';
import {api, endpoints} from '@/services/api';
import {type EngagementMetric, type KnowledgePost} from '@/types';
import {useAppReady} from '@/hooks/useAppReady';
import {AppLoader} from '@/components/layout/AppLoader';
import {EmptyState} from '@/components/EmptyState';

export const KnowledgeHubPage = () => {
  const {appReady} = useAppReady();
  const queryClient = useQueryClient();
  const {data: posts = [], isLoading: isLoadingPosts, error: postsError} = useQuery({
    queryKey: ['knowledge-feed'],
    queryFn: async () => {
      try {
        console.log('[KnowledgeHub] Fetching posts...');
        const {data} = await api.get<KnowledgePost[]>(endpoints.knowledge.root);
        console.log('[KnowledgeHub] Received posts:', data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (err: any) {
        console.error('[KnowledgeHub] Error fetching posts:', err);
        const errorMessage = err.userMessage || err.response?.data?.message || err.message || 'Failed to load knowledge posts';
        throw new Error(errorMessage);
      }
    },
    enabled: appReady, // CRITICAL: Wait for appReady
    retry: 2,
    refetchOnWindowFocus: false,
  });
  const {data: leaderboard = [], isLoading: isLoadingLeaderboard, error: leaderboardError} = useQuery({
    queryKey: ['knowledge-leaderboard'],
    queryFn: async () => {
      try {
        console.log('[KnowledgeHub] Fetching leaderboard...');
        const {data} = await api.get<EngagementMetric[]>(endpoints.knowledge.leaderboard);
        console.log('[KnowledgeHub] Received leaderboard entries:', data?.length || 0);
        return Array.isArray(data) ? data : [];
      } catch (err: any) {
        console.error('[KnowledgeHub] Error fetching leaderboard:', err);
        // Don't throw for leaderboard - it's not critical
        return [];
      }
    },
    enabled: appReady, // CRITICAL: Wait for appReady
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (!appReady) {
    return <AppLoader message="Loading knowledge hub..." />;
  }

  const likeMutation = useMutation({
    mutationFn: (id: string) => api.post(endpoints.knowledge.like(id)),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['knowledge-feed']})
  });
  const bookmarkMutation = useMutation({
    mutationFn: (id: string) => api.post(endpoints.knowledge.bookmark(id)),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['knowledge-feed']})
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6 pb-4 sm:pb-8 pt-12 sm:pt-16">
      <header className="flex flex-col gap-3 sm:gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-glass lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Knowledge Hub</p>
          <h1 className="mt-2 text-xl sm:text-2xl md:text-3xl font-semibold text-white">Stay sharp with curated insights</h1>
          <p className="mt-2 max-w-lg text-base text-slate-300">Short tutorials, daily tech bites, and quick challenges from the community.</p>
        </div>
        <button className="rounded-lg bg-gradient-to-r from-sky-500 to-sky-500 px-4 py-3 text-base font-semibold text-white shadow-lift whitespace-nowrap mt-2 lg:mt-0 hover:bg-sky-600 min-h-[44px] touch-manipulation">
          Share a tutorial
        </button>
      </header>

      <div className="mt-4 sm:mt-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <section className="space-y-4 min-w-0">
          {isLoadingPosts && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-500 border-r-transparent mb-4"></div>
                <p className="text-base text-slate-400">Loading knowledge posts...</p>
              </div>
            </div>
          )}
          {postsError && (
            <div className="flex items-center justify-center py-12">
              <EmptyState
                icon={BookOpen}
                title="Failed to load posts"
                description={postsError instanceof Error ? postsError.message : 'Unable to load knowledge posts. Please try again.'}
                action={{
                  label: 'Retry',
                  onClick: () => window.location.reload(),
                }}
              />
            </div>
          )}
          {!isLoadingPosts && !postsError && posts.length > 0 && posts.map((post) => (
            <article key={post._id} className="glass-card rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{post.type}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{post.title}</h2>
                  <p className="mt-2 text-sm text-slate-300">{post.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags?.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-slate-400">
                  <button onClick={() => likeMutation.mutate(post._id)} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1">
                    <Heart className="h-3 w-3" /> {post.likes.length}
                  </button>
                  <button onClick={() => bookmarkMutation.mutate(post._id)} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1">
                    <Bookmark className="h-3 w-3" /> {post.bookmarks.length}
                  </button>
                  <button className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1">
                    <MessageCircle className="h-3 w-3" /> {post.comments.length}
                  </button>
                </div>
              </div>
            </article>
          ))}
          {!isLoadingPosts && !postsError && posts.length === 0 && (
            <EmptyState
              icon={BookOpen}
              title="No posts yet"
              description="Be the first to share knowledge! Posts will appear here once created."
            />
          )}
        </section>
        <aside className="space-y-4 min-w-0">
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-semibold text-white">Trending creators</h3>
            <ul className="mt-4 space-y-3 text-xs text-slate-300">
                {leaderboard.slice(0, 5).map((entry: EngagementMetric, index: number) => (
                <li key={typeof entry.userId === 'string' ? entry.userId : entry.userId._id} className="flex items-center justify-between">
                  <span>
                    {index + 1}. {entry.userId.username}
                  </span>
                  <span>{entry.xp} XP</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-xs sm:text-sm text-slate-300">
            <p className="font-semibold text-white">Daily prompt</p>
            <p className="mt-2 text-xs text-slate-400">Share one thing you debugged today and what caused it.</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

