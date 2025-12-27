import {type FormEvent, useState} from 'react';
import {useMutation, useQuery} from '@tanstack/react-query';
import {useAuthStore} from '@/store/authStore';
import {api, endpoints} from '@/services/api';
import {type SocialLink, type User} from '@/types';

export const ProfilePage = () => {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [bio, setBio] = useState(user?.bio ?? user?.onboardingAnswers?.bio ?? '');
  const [links, setLinks] = useState<SocialLink[]>(user?.socialLinks ?? user?.onboardingAnswers?.socialLinks ?? []);
  const {data: me} = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const {data} = await api.get<User>(endpoints.auth.me);
      // Extract bio and socialLinks from onboardingAnswers if needed
      if (data && !data.bio && data.onboardingAnswers?.bio) {
        data.bio = data.onboardingAnswers.bio;
      }
      if (data && !data.socialLinks && data.onboardingAnswers?.socialLinks) {
        data.socialLinks = data.onboardingAnswers.socialLinks;
      }
      return data;
    },
    onSuccess: (data) => {
      // Update local state when data is fetched
      if (data?.bio || data?.onboardingAnswers?.bio) {
        setBio(data.bio || data.onboardingAnswers?.bio || '');
      }
      if (data?.socialLinks || data?.onboardingAnswers?.socialLinks) {
        setLinks(data.socialLinks || data.onboardingAnswers?.socialLinks || []);
      }
    }
  });

  const mutation = useMutation({
    mutationFn: async (payload: Partial<User>) => {
      const {data} = await api.patch<User>(endpoints.auth.me, payload);
      return data;
    },
    onSuccess: (data) => {
      updateUser(data);
    }
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({bio, socialLinks: links});
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-3 sm:px-4 md:px-6 pb-8 sm:pb-14 pt-16 sm:pt-20 md:pt-24">
      <header className="rounded-2xl sm:rounded-[2rem] border border-white/10 bg-slate-900/60 p-4 sm:p-6 md:p-10 text-center shadow-glass">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white">{user?.username}</h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-300 break-words">{user?.skills?.join(' • ') ?? 'Add your skills to unlock tailored journeys.'}</p>
        <p className="mt-1 text-[10px] sm:text-xs text-slate-500">Skill level • {user?.skillLevel ?? 'Explorer'}</p>
      </header>

      <form onSubmit={handleSubmit} className="mt-6 sm:mt-10 space-y-4 sm:space-y-6">
        <section className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
          <h2 className="text-base sm:text-lg font-semibold text-white">About you</h2>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
            className="mt-4 w-full rounded-3xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-200 focus:border-primaryTo focus:outline-none"
            placeholder="Tell the community how you like to learn, collaborate, or mentor."
          />
        </section>
        <section className="glass-card space-y-3 sm:space-y-4 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <h2 className="text-base sm:text-lg font-semibold text-white">Social links</h2>
            <button
              type="button"
              onClick={() => setLinks((prev) => [...prev, {platform: '', url: ''}])}
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200"
            >
              Add link
            </button>
          </div>
          {links.map((link, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-2">
              <input
                value={link.platform}
                onChange={(event) => {
                  const next = [...links];
                  next[index] = {...next[index], platform: event.target.value};
                  setLinks(next);
                }}
                placeholder="Platform"
                className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
              />
              <input
                value={link.url}
                onChange={(event) => {
                  const next = [...links];
                  next[index] = {...next[index], url: event.target.value};
                  setLinks(next);
                }}
                placeholder="https://"
                className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200"
              />
            </div>
          ))}
        </section>
        <section className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8">
          <h2 className="text-base sm:text-lg font-semibold text-white">Badges unlocked</h2>
          <div className="mt-4 flex flex-wrap gap-3 text-xs uppercase tracking-[0.35em] text-slate-400">
            {me?.badges?.length
              ? me.badges.map((badge) => (
                  <span key={badge} className="rounded-full border border-white/10 px-3 py-1">
                    {badge}
                  </span>
                ))
              : 'Earn badges by engaging in the community.'}
          </div>
        </section>
        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-gradient-to-r from-primaryFrom to-primaryTo px-5 py-3 text-sm font-semibold text-white shadow-lift"
          >
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
};

