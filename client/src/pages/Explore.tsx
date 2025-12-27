import {useMemo, useState, useEffect} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {motion} from 'framer-motion';
import {useQuery} from '@tanstack/react-query';
import {useNotificationStore} from '@/store/notificationStore';
import {techGroupsAPI} from '@/lib/api';
import {useAuthStore} from '@/store/authStore';
import {useChatStore} from '@/store/chatStore';
import {SkillAssessmentModal} from '@/components/Explore/SkillAssessmentModal';
import {useAppReady} from '@/hooks/useAppReady';
import {AppLoader} from '@/components/layout/AppLoader';
import {EmptyState} from '@/components/EmptyState';
import {Users} from 'lucide-react';

const skills = ['Fullstack', 'Backend', 'Frontend', 'Cybersecurity', 'Data Science', 'Cloud', 'UI/UX', 'AI/ML'];

export const ExplorePage = () => {
  const {appReady} = useAppReady();
  const {search} = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const [activeSkill, setActiveSkill] = useState(params.get('tag')?.replace(/-/g, ' ') ?? 'Fullstack');
  const [assessmentModal, setAssessmentModal] = useState<{groupId: string; groupName: string; techSkill: string} | null>(null);
  const pushNotification = useNotificationStore((state) => state.push);
  const user = useAuthStore((state) => state.user);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  
  // Handle groupId from URL params (when navigating from View Group button)
  useEffect(() => {
    if (!appReady) return; // Wait for appReady before processing navigation
    const groupId = params.get('groupId');
    if (groupId) {
      setActiveConversation(groupId);
      navigate('/community-hangout', {replace: true});
    }
  }, [params, setActiveConversation, navigate, appReady]);

  // Fetch tech groups from database - only when app is ready
  const {data: techGroups = [], isLoading, error} = useQuery({
    queryKey: ['tech-groups-explore'],
    queryFn: async () => {
      try {
        console.log('[Explore] Fetching tech groups...');
        const groups = await techGroupsAPI.list();
        console.log('[Explore] Received groups:', groups?.length || 0);
        return Array.isArray(groups) ? groups : [];
      } catch (err: any) {
        console.error('[Explore] Error fetching tech groups:', err);
        const errorMessage = err.userMessage || err.response?.data?.message || err.message || 'Failed to load tech groups';
        throw new Error(errorMessage);
      }
    },
    enabled: appReady, // CRITICAL: Wait for appReady
    retry: 2,
    staleTime: 30000, // Cache for 30 seconds
    refetchOnWindowFocus: false,
  });

  if (!appReady) {
    return <AppLoader message="Loading tech groups..." />;
  }

  // Filter groups by active skill (match topics or name)
  const filteredGroups = useMemo(() => {
    if (!techGroups || techGroups.length === 0) return [];
    
    // Map skills to related keywords for better matching
    const skillKeywords: Record<string, string[]> = {
      'fullstack': ['fullstack', 'full-stack', 'full stack', 'web development', 'mern', 'mean', 'stack'],
      'backend': ['backend', 'back-end', 'back end', 'server', 'api', 'node', 'express', 'database'],
      'frontend': ['frontend', 'front-end', 'front end', 'react', 'vue', 'angular', 'ui', 'ux', 'javascript', 'typescript'],
      'cybersecurity': ['cybersecurity', 'cyber security', 'security', 'hacking', 'penetration', 'encryption'],
      'data science': ['data science', 'data', 'analytics', 'machine learning', 'ml', 'ai', 'python', 'pandas'],
      'cloud': ['cloud', 'aws', 'azure', 'gcp', 'devops', 'infrastructure'],
      'ui/ux': ['ui', 'ux', 'design', 'figma', 'user interface', 'user experience'],
      'ai/ml': ['ai', 'ml', 'artificial intelligence', 'machine learning', 'deep learning', 'neural', 'tensorflow'],
    };
    
    const skillLower = activeSkill.toLowerCase();
    const keywords = skillKeywords[skillLower] || [skillLower];
    
    return techGroups.filter(group => {
      const groupTopics = (group.topics || []).join(' ').toLowerCase();
      const groupName = (group.name || '').toLowerCase();
      const groupDescription = (group.description || '').toLowerCase();
      const searchText = `${groupTopics} ${groupName} ${groupDescription}`;
      
      // Check if any keyword matches
      return keywords.some(keyword => searchText.includes(keyword.toLowerCase()));
    });
  }, [techGroups, activeSkill]);

  const handleJoin = async (groupId: string, groupName: string) => {
    if (!user) {
      pushNotification({
        id: 'join-error-auth',
        title: 'Authentication required',
        message: 'Please log in to join groups.'
      });
      return;
    }

    // Check if user is already a member
    const group = filteredGroups.find((g) => (g.groupId || g._id) === groupId);
    if (group?.members?.includes(user.userId)) {
      // Navigate to Community Hangout and select this group
      setActiveConversation(groupId);
      navigate('/community-hangout');
      return;
    }

    // Extract tech skill from group
    const techSkill = extractTechSkillFromGroup(group || {name: groupName, topics: []});
    
    // Open assessment modal instead of directly joining
    setAssessmentModal({
      groupId,
      groupName,
      techSkill: techSkill || activeSkill,
    });
  };

  const extractTechSkillFromGroup = (group: any): string => {
    if (!group) return activeSkill;
    
    // Check topics first
    if (Array.isArray(group.topics) && group.topics.length > 0) {
      const skillTopics = ['Frontend', 'Backend', 'Fullstack', 'Mobile', 'AI/ML', 'Data Science', 'Cybersecurity', 'Cloud', 'DevOps', 'UI/UX'];
      for (const topic of group.topics) {
        const matched = skillTopics.find((skill) => topic.toLowerCase().includes(skill.toLowerCase()));
        if (matched) return matched;
      }
    }
    
    // Check group name
    const name = (group.name || '').toLowerCase();
    const skillMap: Record<string, string> = {
      frontend: 'Frontend',
      backend: 'Backend',
      fullstack: 'Fullstack',
      'full-stack': 'Fullstack',
      mobile: 'Mobile',
      'ai/ml': 'AI/ML',
      'data science': 'Data Science',
      cybersecurity: 'Cybersecurity',
      cloud: 'Cloud',
      devops: 'DevOps',
      'ui/ux': 'UI/UX',
    };
    
    for (const [key, value] of Object.entries(skillMap)) {
      if (name.includes(key)) return value;
    }
    
    return activeSkill; // Fallback to active skill filter
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 md:px-6 pb-4 sm:pb-8 pt-12 sm:pt-16">
      <header className="flex flex-col gap-3 sm:gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-glass md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-white">Explore Tech Skills</h1>
          <p className="mt-2 max-w-xl text-base text-slate-300">
            Choose a speciality to unlock curated communities, classroom tracks, and relevant knowledge bites.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <button
              key={skill}
              onClick={() => setActiveSkill(skill)}
              className={skill === activeSkill ? 'rounded-lg bg-gradient-to-r from-sky-500 to-sky-500 px-4 py-3 text-base font-semibold text-white shadow-lift whitespace-nowrap min-h-[44px] touch-manipulation' : 'rounded-lg border border-white/10 px-4 py-3 text-base text-slate-200 transition hover:border-sky-600 whitespace-nowrap min-h-[44px] touch-manipulation'}
            >
              {skill}
            </button>
          ))}
        </div>
      </header>

      <section className="mt-4 sm:mt-6 grid gap-4 lg:grid-cols-2">
        {isLoading && (
          <div className="col-span-2 flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-500 border-r-transparent mb-4"></div>
              <p className="text-base text-slate-400">Loading tech groups...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="col-span-2 text-center py-12">
            <p className="text-base text-rose-400 mb-2">Failed to load tech groups</p>
            <p className="text-sm text-slate-500 mb-4">{error instanceof Error ? error.message : 'Please refresh the page or check your connection'}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-sky-500 px-4 py-2 text-base font-semibold text-white hover:bg-sky-600 min-h-[44px] touch-manipulation"
            >
              Retry
            </button>
          </div>
        )}
        {!isLoading && !error && filteredGroups.length > 0 && filteredGroups.map((group) => (
          <motion.article key={group.groupId || group._id} whileHover={{y: -3}} className="glass-card flex flex-col gap-3 rounded-2xl p-4 sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{group.type === 'classroom' ? 'Classroom' : 'Community'}</p>
              <h2 className="mt-2 text-lg sm:text-xl font-semibold text-white">{group.name}</h2>
              <p className="mt-2 text-base text-slate-300">{group.description || 'Join this community to collaborate and learn.'}</p>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span>Members • {group.members?.length || group.memberCount || 0}</span>
              <span className="h-1 w-1 rounded-full bg-slate-600" />
              <span>Topics • {group.topics?.length || 0}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {group.topics && group.topics.slice(0, 5).map((tag: string) => (
                <span key={tag} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300">
                  #{tag}
                </span>
              ))}
            </div>
            <button
              onClick={() => handleJoin(group.groupId || group._id, group.name)}
              className="mt-auto rounded-lg bg-gradient-to-r from-secondaryFrom to-secondaryTo px-4 py-3 text-base font-semibold text-white shadow-lift min-h-[44px] touch-manipulation"
            >
              {group.members?.includes(user?.userId) ? 'View Group' : 'Join Circle'}
            </button>
          </motion.article>
        ))}
        {!isLoading && !error && filteredGroups.length === 0 && techGroups.length > 0 && (
          <div className="col-span-2 text-center py-12">
            <p className="text-base text-slate-400 mb-2">No groups found for {activeSkill}</p>
            <p className="text-sm text-slate-500">Try another skill or create a new group</p>
          </div>
        )}
        {!isLoading && !error && techGroups.length === 0 && (
          <div className="col-span-2 flex items-center justify-center py-12">
            <EmptyState
              icon={Users}
              title="No tech groups available"
              description="Tech groups will appear here once they are created. Check back later or create your own group."
            />
          </div>
        )}
      </section>

      {/* Assessment Modal */}
      {assessmentModal && (
        <SkillAssessmentModal
          groupId={assessmentModal.groupId}
          groupName={assessmentModal.groupName}
          techSkill={assessmentModal.techSkill}
          isOpen={true}
          onClose={() => setAssessmentModal(null)}
          onSuccess={() => {
            setAssessmentModal(null);
          }}
        />
      )}
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

