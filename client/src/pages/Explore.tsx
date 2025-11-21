import {useMemo, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {motion} from 'framer-motion';
import {useNotificationStore} from '@/store/notificationStore';

const skills = ['Fullstack', 'Backend', 'Frontend', 'Cybersecurity', 'Data Science', 'Cloud', 'UI/UX', 'AI/ML'];

export const ExplorePage = () => {
  const {search} = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const [activeSkill, setActiveSkill] = useState(params.get('tag')?.replace(/-/g, ' ') ?? 'Fullstack');
  const pushNotification = useNotificationStore((state) => state.push);

  const handleJoin = (skill: string) => {
    pushNotification({
      id: `join-${skill}`,
      title: 'Request sent',
      message: `Community moderators will confirm your access to ${skill}.`
    });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6 pb-8 sm:pb-14 pt-16 sm:pt-20 md:pt-24">
      <header className="flex flex-col gap-4 sm:gap-6 rounded-2xl sm:rounded-[2rem] border border-white/10 bg-slate-900/60 p-4 sm:p-6 md:p-10 shadow-glass md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white">Explore Tech Skills</h1>
          <p className="mt-2 max-w-xl text-xs sm:text-sm text-slate-300">
            Choose a speciality to unlock curated communities, classroom tracks, and relevant knowledge bites.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {skills.map((skill) => (
            <button
              key={skill}
              onClick={() => setActiveSkill(skill)}
              className={skill === activeSkill ? 'rounded-xl sm:rounded-2xl bg-gradient-to-r from-primaryFrom to-primaryTo px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-lift whitespace-nowrap' : 'rounded-xl sm:rounded-2xl border border-white/10 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-200 transition hover:border-primaryTo whitespace-nowrap'}
            >
              {skill}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-6 sm:mt-10 grid gap-4 sm:gap-6 lg:grid-cols-2">
        {communityCards[activeSkill]?.map((card) => (
          <motion.article key={card.title} whileHover={{y: -3}} className="glass-card flex flex-col gap-3 sm:gap-4 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-7">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{card.badge}</p>
              <h2 className="mt-3 text-xl font-semibold text-white">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{card.description}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>Members • {card.members}</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span>Weekly sessions • {card.sessions}</span>
            </div>
            <div className="flex gap-2">
              {card.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                  #{tag}
                </span>
              ))}
            </div>
            <button
              onClick={() => handleJoin(activeSkill)}
              className="mt-auto rounded-full bg-gradient-to-r from-secondaryFrom to-secondaryTo px-4 py-2 text-sm font-semibold text-white shadow-lift"
            >
              Join {activeSkill} circle
            </button>
          </motion.article>
        )) ?? <p className="text-sm text-slate-400">More communities coming soon.</p>}
      </section>
    </div>
  );
};

const communityCards: Record<string, Array<{title: string; description: string; badge: string; members: string; sessions: string; tags: string[]}>> = {
  Fullstack: [
    {
      title: 'Fullstack Foundry',
      description: 'Pair-programming sprints, architecture reviews, and code clinics.',
      badge: 'Welcome circle',
      members: '1.4k',
      sessions: '3',
      tags: ['node', 'react', 'architecture']
    },
    {
      title: 'API Artisans',
      description: 'GraphQL vs REST, caching, testing and scaling APIs.',
      badge: 'Advanced',
      members: '980',
      sessions: '2',
      tags: ['graphql', 'rest', 'testing']
    }
  ],
  Backend: [
    {
      title: 'Distributed Systems Lab',
      description: 'Deep dives into microservices, event-driven design, and observability.',
      badge: 'Invite recommended',
      members: '730',
      sessions: '1',
      tags: ['microservices', 'observability', 'queues']
    }
  ],
  Frontend: [
    {
      title: 'UI Performance Guild',
      description: 'Animations, accessibility, and high-performance UI engineering.',
      badge: 'Featured',
      members: '1.1k',
      sessions: '2',
      tags: ['performance', 'a11y', 'animation']
    }
  ],
  Cybersecurity: [
    {
      title: 'Red vs Blue Arena',
      description: 'Hands-on threat simulations with weekly capture-the-flag events.',
      badge: 'Security',
      members: '540',
      sessions: '4',
      tags: ['ctf', 'threat-model', 'blue-team']
    }
  ],
  'Data Science': [
    {
      title: 'Insight Collective',
      description: 'Notebook show-&-tell, Kaggle reviews, and ML ops clinics.',
      badge: 'Data',
      members: '870',
      sessions: '3',
      tags: ['pandas', 'mlops', 'visualisation']
    }
  ],
  Cloud: [
    {
      title: 'Cloud Control Room',
      description: 'Infrastructure as code, FinOps, and multi-cloud resilience.',
      badge: 'Cloud',
      members: '620',
      sessions: '2',
      tags: ['terraform', 'aws', 'gcp']
    }
  ],
  'UI/UX': [
    {
      title: 'Design to Dev Bridge',
      description: 'Component libraries, design systems, and usability labs.',
      badge: 'UX',
      members: '760',
      sessions: '2',
      tags: ['figma', 'design-system', 'research']
    }
  ],
  'AI/ML': [
    {
      title: 'Model Makers Club',
      description: 'Prompt engineering, model evaluation, and ethical AI debates.',
      badge: 'AI',
      members: '990',
      sessions: '3',
      tags: ['llm', 'ethics', 'evaluation']
    }
  ]
};

