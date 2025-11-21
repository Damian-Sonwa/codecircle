import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../providers/SocketProvider';
import { techGroupsAPI } from '../../lib/api';
import { useNotificationStore } from '../../store/notificationStore';
import { api, endpoints } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Layers,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const STEP_ORDER = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'skills', label: 'Tech Interests' },
  { key: 'level', label: 'Skill Level' },
  { key: 'verification', label: 'Verification' },
  { key: 'groups', label: 'Communities' },
  { key: 'tour', label: 'Guided Tour' },
];

const TOUR_STEPS = [
  {
    key: 'dashboard',
    title: 'Dashboard',
    description:
      'Track your learning streaks, upcoming sessions, and quick stats right from the dashboard.',
    target: 'dashboard',
  },
  {
    key: 'explore',
    title: 'Join Tech Group',
    description:
      'Pick a focus area, answer quick questions, and instantly join the best-fit tech circle.',
    target: 'explore',
  },
  {
    key: 'messages',
    title: 'Messages',
    description:
      'Keep conversations flowing with communities and peers in real time here.',
    target: 'messages',
  },
  {
    key: 'classroom',
    title: 'Classroom',
    description:
      'Join live classes, workshops, and study groups led by mentors inside Classroom.',
    target: 'classroom',
  },
  {
    key: 'profile',
    title: 'Profile',
    description:
      'Showcase your skills, certifications, and growth journey. Update details anytime.',
    target: 'profile',
  },
];

const SKILL_OPTIONS = [
  'Fullstack',
  'Cybersecurity',
  'Data Science',
  'Artificial Intelligence',
  'Cloud & DevOps',
  'Blockchain',
  'UI/UX',
  'Mobile Development',
];

const SKILL_GROUP_SUGGESTIONS = [
  {
    name: 'Fullstack Builders',
    matches: ['Fullstack', 'UI/UX', 'Mobile Development'],
    description: 'Weekly build challenges and code reviews.',
  },
  {
    name: 'Cyber Defenders',
    matches: ['Cybersecurity'],
    description: 'Capture the flag drills and security labs.',
  },
  {
    name: 'Data Science Lab',
    matches: ['Data Science', 'Artificial Intelligence'],
    description: 'Datasets, Kaggle collabs, and ML experiments.',
  },
  {
    name: 'AI Innovators',
    matches: ['Artificial Intelligence'],
    description: 'Model deployments, paper clubs, and AI ethics.',
  },
  {
    name: 'Cloud Guild',
    matches: ['Cloud & DevOps'],
    description: 'Cert prep, infra reviews, and architecture clinics.',
  },
  {
    name: 'DeFi & Web3 Collective',
    matches: ['Blockchain'],
    description: 'Smart contract audits and tokenomics breakdowns.',
  },
];

const DEFAULT_ONBOARDING_DATA = {
  skills: [],
  level: '',
  verification: {
    motivation: '',
    recentWin: '',
  },
  groups: {
    autoJoined: false,
    welcomeGroupId: null,
    selectedSuggestions: [],
  },
  tour: {
    currentIndex: 0,
    completed: false,
  },
};

const WELCOME_GROUP_NAME = 'CodeCircle Welcome Lounge';

const OnboardingFlow = ({ initialState, onUpdate, onComplete }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const updateUser = useAuthStore((state) => state.updateUser);
  const pushNotification = useNotificationStore((state) => state.push);

  const [stepIndex, setStepIndex] = useState(initialState?.currentStep ?? 0);
  const [completedSteps, setCompletedSteps] = useState(
    initialState?.completedSteps ?? []
  );
  const [formData, setFormData] = useState(() => {
    const merged = {
      ...DEFAULT_ONBOARDING_DATA,
      ...(initialState?.data || {}),
      verification: {
        ...DEFAULT_ONBOARDING_DATA.verification,
        ...(initialState?.data?.verification || {}),
      },
      groups: {
        ...DEFAULT_ONBOARDING_DATA.groups,
        ...(initialState?.data?.groups || {}),
      },
      tour: {
        ...DEFAULT_ONBOARDING_DATA.tour,
        ...(initialState?.data?.tour || {}),
      },
    };
    return merged;
  });

  const [tourIndex, setTourIndex] = useState(
    initialState?.data?.tour?.currentIndex ?? 0
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [groups, setGroups] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const lastPersistedSnapshot = useRef(null);

  useEffect(() => {
    lastPersistedSnapshot.current = null;
  }, []);

  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const currentStep = STEP_ORDER[stepIndex];
  const isFinalStep = currentStep?.key === 'tour';

  const completionProgress = useMemo(() => {
    const total = STEP_ORDER.length;
    if (!isFinalStep) {
      return ((stepIndex + (currentStep ? 1 : 0)) / total) * 100;
    }
    const tourProgress = (tourIndex + 1) / TOUR_STEPS.length;
    return ((STEP_ORDER.length - 1 + tourProgress) / total) * 100;
  }, [stepIndex, tourIndex, isFinalStep, currentStep]);

  useEffect(() => {
    let isMounted = true;
    techGroupsAPI
      .list()
      .then((list) => {
        if (isMounted) {
          setGroups(list);
        }
      })
      .catch((err) => {
        console.error('Failed to load tech groups for onboarding:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!socket || !user) return undefined;
    if (currentStep?.key !== 'groups') return undefined;
    if (formData.groups.autoJoined) return undefined;

    let cancelled = false;

    const joinWelcomeGroup = async () => {
      setIsProcessing(true);
      const group = await ensureGroupAndJoin(WELCOME_GROUP_NAME);
      if (!cancelled && group) {
        setFormData((prev) => ({
          ...prev,
          groups: {
            ...prev.groups,
            autoJoined: true,
            welcomeGroupId: group.groupId,
          },
        }));
      }
      if (!cancelled) {
        setIsProcessing(false);
      }
    };

    joinWelcomeGroup();

    return () => {
      cancelled = true;
    };
  }, [currentStep?.key, formData.groups.autoJoined, socket, user]);

  useEffect(() => {
    if (!onUpdate || !currentStep) return;
    const snapshot = {
      currentStep: stepIndex,
      completed: false,
      completedSteps,
      data: {
        ...formData,
        tour: {
          ...formData.tour,
          currentIndex: tourIndex,
        },
      },
    };
    const snapshotString = JSON.stringify(snapshot);
    if (lastPersistedSnapshot.current === snapshotString) {
      return;
    }
    lastPersistedSnapshot.current = snapshotString;
    onUpdate(snapshot);
  }, [stepIndex, completedSteps, formData, tourIndex, onUpdate, currentStep]);

  useEffect(() => {
    if (currentStep?.key !== 'tour') {
      clearTourHighlights();
      return undefined;
    }

    const activeTour = TOUR_STEPS[tourIndex];
    if (!activeTour) return undefined;

    const element = document.querySelector(
      `[data-tour-id="${activeTour.target}"]`
    );
    if (element) {
      element.classList.add('onboarding-highlight');
    }

    return () => {
      if (element) {
        element.classList.remove('onboarding-highlight');
      }
    };
  }, [currentStep?.key, tourIndex]);

  useEffect(() => () => clearTourHighlights(), []);

  const ensureGroupAndJoin = async (groupName) => {
    if (!socket || !user) {
      return null;
    }
    try {
      let group =
        groupsRef.current.find(
          (item) => item.name.toLowerCase() === groupName.toLowerCase()
        ) ?? null;

      if (!group) {
        const created = await techGroupsAPI.create({
          name: groupName,
          createdBy: user.userId,
        });
        if (created) {
          group = created;
          setGroups((prev) => [...prev, created]);
        }
      }

      if (group) {
        await techGroupsAPI.join(group.groupId, user.userId);
        socket.emit('group:join', {
          groupId: group.groupId,
          userId: user.userId,
        });
      }

      return group;
    } catch (error) {
      console.error(`Failed to ensure tech group ${groupName}:`, error);
      return null;
    }
  };

  const clearTourHighlights = () => {
    TOUR_STEPS.forEach(({ target }) => {
      const element = document.querySelector(`[data-tour-id="${target}"]`);
      if (element) {
        element.classList.remove('onboarding-highlight');
      }
    });
  };

  const toggleSkill = (skill) => {
    setFormData((prev) => {
      const exists = prev.skills.includes(skill);
      const nextSkills = exists
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill];
      return {
        ...prev,
        skills: nextSkills,
      };
    });
  };

  const toggleSuggestedGroup = (groupName) => {
    setFormData((prev) => {
      const already = prev.groups.selectedSuggestions.includes(groupName);
      const selected = already
        ? prev.groups.selectedSuggestions.filter((g) => g !== groupName)
        : [...prev.groups.selectedSuggestions, groupName];
      return {
        ...prev,
        groups: {
          ...prev.groups,
          selectedSuggestions: selected,
        },
      };
    });
  };

  const markCurrentStepComplete = () => {
    const key = currentStep?.key;
    if (!key) return;
    setCompletedSteps((prev) =>
      prev.includes(key) ? prev : [...prev, key]
    );
  };

  const handlePrevious = () => {
    setErrorMessage('');
    if (stepIndex === 0) return;
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = async () => {
    setErrorMessage('');
    const key = currentStep?.key;
    if (!key) {
      return;
    }

    if (key === 'skills' && formData.skills.length === 0) {
      setErrorMessage('Pick at least one interest to personalize CodeCircle.');
      return;
    }

    if (key === 'level' && !formData.level) {
      setErrorMessage('Choose the skill level that fits you best to continue.');
      return;
    }

    if (key === 'verification') {
      const { motivation, recentWin } = formData.verification;
      if (!motivation.trim() || !recentWin.trim()) {
        setErrorMessage(
          'Share a quick motivation and a recent win before continuing.'
        );
        return;
      }
    }

    if (key === 'groups') {
      setIsProcessing(true);
      await Promise.all(
        formData.groups.selectedSuggestions.map((groupName) =>
          ensureGroupAndJoin(groupName)
        )
      );
      setIsProcessing(false);
    }

    markCurrentStepComplete();
    setStepIndex((prev) => Math.min(STEP_ORDER.length - 1, prev + 1));
  };

  const handleTourNext = () => {
    setFormData((prev) => ({
      ...prev,
      tour: {
        ...prev.tour,
        currentIndex: Math.min(TOUR_STEPS.length - 1, tourIndex + 1),
      },
    }));
    setTourIndex((prev) => Math.min(TOUR_STEPS.length - 1, prev + 1));
  };

  const handleTourPrev = () => {
    setFormData((prev) => ({
      ...prev,
      tour: {
        ...prev.tour,
        currentIndex: Math.max(0, tourIndex - 1),
      },
    }));
    setTourIndex((prev) => Math.max(0, prev - 1));
  };

  const handleFinish = async () => {
    if (isProcessing) return; // Prevent double-clicks
    setIsProcessing(true);
    try {
      markCurrentStepComplete();
      
      // Call API to complete onboarding
      let apiSuccess = false;
      try {
        const response = await api.post(endpoints.onboarding.complete, {
          skills: formData.skills,
          skillLevel: formData.level,
          answers: formData.verification,
        });
        console.log('[Onboarding] Successfully completed onboarding via API', response.data);
        apiSuccess = true;
      } catch (apiError) {
        console.error('[Onboarding] Failed to complete onboarding via API:', apiError);
        // Show error but continue to update local state
        pushNotification({
          id: 'onboarding-api-error',
          title: 'Warning',
          message: 'Onboarding saved locally, but server sync failed. Please refresh.',
          type: 'error'
        });
      }
      
      // Update user state to mark onboarding as complete
      updateUser({
        hasOnboarded: true,
        profileCompleted: true,
        onboardingCompleted: true,
        skills: formData.skills,
        skillLevel: formData.level,
      });
      console.log('[Onboarding] User state updated');
      
      // Show success notification
      pushNotification({
        id: 'onboarding-complete',
        title: '🎉 Welcome to CodeCircle!',
        message: 'Your profile is set up. Let\'s explore the platform!',
        type: 'success'
      });
      
      const payload = {
        completed: true,
        completedAt: new Date().toISOString(),
        currentStep: STEP_ORDER.length - 1,
        completedSteps: Array.from(
          new Set([...completedSteps, currentStep.key])
        ),
        data: {
          ...formData,
          tour: {
            ...formData.tour,
            completed: true,
            currentIndex: tourIndex,
          },
        },
      };
      
      // Call onComplete callback (if provided) - this should close the modal
      if (onComplete) {
        console.log('[Onboarding] Calling onComplete callback');
        onComplete(payload);
      } else {
        console.warn('[Onboarding] No onComplete callback provided');
      }
      
      // Navigate to dashboard after a short delay to show the success message
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
        console.log('[Onboarding] Navigating to dashboard');
      }, 1000);
    } catch (error) {
      console.error('[Onboarding] Error finishing onboarding:', error);
    } finally {
      setIsProcessing(false);
      clearTourHighlights();
    }
  };

  const filteredGroupSuggestions = useMemo(() => {
    if (formData.skills.length === 0) {
      return SKILL_GROUP_SUGGESTIONS;
    }
    return SKILL_GROUP_SUGGESTIONS.filter((group) =>
      group.matches.some((skill) => formData.skills.includes(skill))
    );
  }, [formData.skills]);

  const renderWelcome = () => (
    <div className="flex flex-col items-center text-center gap-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="relative"
      >
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl" />
        <motion.div
          animate={{ rotate: [0, 12, -8, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        >
          <Sparkles className="h-16 w-16 text-primary drop-shadow-lg" />
        </motion.div>
      </motion.div>
      <div className="space-y-3">
        <h2 className="text-3xl font-extrabold gradient-text">
          Welcome to CodeCircle!
        </h2>
        <p className="text-base text-muted-foreground max-w-xl">
          Learn. Chat. Grow. We tailor your experience from day one so every
          connection and resource amplifies your goals.
        </p>
      </div>
      <div className="rounded-2xl bg-muted/60 dark:bg-muted/30 backdrop-blur-sm p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>Your responses shape recommendations, communities, and events.</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Compass className="h-4 w-4 text-primary" />
          <span>Pick interests, join specialized groups, and unlock guided tours.</span>
        </div>
      </div>
    </div>
  );

  const renderSkills = () => (
    <div className="space-y-5">
      <div>
        <h3 className="text-2xl font-semibold mb-2">Pick your focus areas</h3>
        <p className="text-sm text-muted-foreground">
          These power your recommendations, challenges, and mentor matches.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SKILL_OPTIONS.map((skill) => {
          const isSelected = formData.skills.includes(skill);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all border ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/30'
                  : 'bg-background hover:bg-accent/40'
              }`}
            >
              {skill}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderLevel = () => (
    <div className="space-y-5">
      <div>
        <h3 className="text-2xl font-semibold mb-2">How would you describe your current level?</h3>
        <p className="text-sm text-muted-foreground">
          We use this to tailor resources, peers, and learning paths.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            value: 'Beginner',
            title: 'Beginner',
            description: 'Starting out or exploring something new.',
          },
          {
            value: 'Intermediate',
            title: 'Intermediate',
            description: 'Comfortable building projects and collaborating.',
          },
          {
            value: 'Professional',
            title: 'Professional',
            description: 'Leading initiatives or mentoring others.',
          },
        ].map((option) => {
          const active = formData.level === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, level: option.value }))
              }
              className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/40'
                  : 'bg-background'
              }`}
            >
              <div className="text-lg font-semibold">{option.title}</div>
              <p className="text-sm mt-2 opacity-80">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderVerification = () => (
    <div className="space-y-5">
      <div>
        <h3 className="text-2xl font-semibold mb-2">
          A quick check before we connect you
        </h3>
        <p className="text-sm text-muted-foreground">
          Your responses help moderators keep communities focused and supportive.
        </p>
      </div>
      <div className="grid gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            What brings you to CodeCircle right now?
          </label>
          <textarea
            rows={3}
            value={formData.verification.motivation}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                verification: {
                  ...prev.verification,
                  motivation: event.target.value,
                },
              }))
            }
            className="w-full rounded-xl border bg-background/80 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Share the goal or challenge you're working on."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Tell us about a recent project or learning win.
          </label>
          <textarea
            rows={3}
            value={formData.verification.recentWin}
            onChange={(event) =>
              setFormData((prev) => ({
                ...prev,
                verification: {
                  ...prev.verification,
                  recentWin: event.target.value,
                },
              }))
            }
            className="w-full rounded-xl border bg-background/80 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="A shipped feature, passed exam, hackathon, etc."
          />
        </div>
      </div>
    </div>
  );

  const renderGroups = () => (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-semibold">Communities unlocked</h3>
        <p className="text-sm text-muted-foreground">
          You&apos;re already part of the CodeCircle Welcome Lounge. Choose a few skill-based
          groups to get started with peers.
        </p>
      </div>
      <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users className="h-10 w-10 text-primary" />
          <div>
            <div className="font-semibold text-lg">CodeCircle Welcome Lounge</div>
            <p className="text-sm text-primary/90">
              Introduce yourself and meet the community team.
            </p>
          </div>
        </div>
        <div className="text-sm font-medium text-primary">
          {formData.groups.autoJoined ? 'Joined' : 'Connecting...'}
        </div>
      </div>
      <div className="grid gap-3">
        {filteredGroupSuggestions.map((group) => {
          const selected = formData.groups.selectedSuggestions.includes(
            group.name
          );
          return (
            <button
              key={group.name}
              type="button"
              onClick={() => toggleSuggestedGroup(group.name)}
              className={`flex flex-col items-start rounded-2xl border p-4 transition-all text-left ${
                selected
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                  : 'hover:border-primary/50'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-base font-semibold">{group.name}</span>
                {selected && <Check className="h-4 w-4 text-primary" />}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {group.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTour = () => {
    const activeTour = TOUR_STEPS[tourIndex];
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-primary/30 bg-background/80 p-6 shadow-lg shadow-primary/10">
          <div className="flex items-center gap-3 mb-3">
            <Layers className="h-5 w-5 text-primary" />
            <span className="uppercase text-xs tracking-wide text-primary font-semibold">
              Guided tour
            </span>
          </div>
          <h3 className="text-2xl font-semibold mb-2">{activeTour.title}</h3>
          <p className="text-sm text-muted-foreground">
            {activeTour.description}
          </p>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Highlighting: <strong className="text-primary">{activeTour.title}</strong>
            </span>
            <span>
              Step {tourIndex + 1} / {TOUR_STEPS.length}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleTourPrev}
            disabled={tourIndex === 0 || isProcessing}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {tourIndex < TOUR_STEPS.length - 1 ? (
            <Button onClick={handleTourNext} disabled={isProcessing}>
              Next highlight
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={isProcessing}>
              Finish onboarding
              <Check className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  const contentByStep = {
    welcome: renderWelcome,
    skills: renderSkills,
    level: renderLevel,
    verification: renderVerification,
    groups: renderGroups,
    tour: renderTour,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-5xl"
      >
        <div className="grid gap-6 rounded-3xl border border-border/60 bg-background/95 shadow-2xl shadow-primary/10 backdrop-blur-xl p-6 md:p-8 md:grid-cols-[2fr,1fr]">
          <div className="flex flex-col">
            <div className="mb-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide font-semibold text-primary">
                  Step {stepIndex + 1} of {STEP_ORDER.length}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {currentStep?.label}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-primary to-accent transition-all"
                  style={{ width: `${completionProgress}%` }}
                />
              </div>
            </div>

            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep?.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1"
                >
                  {contentByStep[currentStep?.key]?.()}
                </motion.div>
              </AnimatePresence>
            </div>

            {errorMessage && (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {!isFinalStep && (
              <div className="mt-6 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={stepIndex === 0 || isProcessing}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={isProcessing}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/60 dark:bg-muted/10 p-4 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Onboarding checklist
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Save anytime — we remember where you left off.
              </p>
            </div>
            <div className="space-y-2">
              {STEP_ORDER.map((step, index) => {
                const isCompleted = completedSteps.includes(step.key);
                const isActive = index === stepIndex;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-all ${
                      isCompleted
                        ? 'border-primary/60 bg-primary/10 text-primary'
                        : isActive
                        ? 'border-primary/50 bg-background'
                        : 'border-border bg-background/70 text-muted-foreground'
                    }`}
                  >
                    <span>{step.label}</span>
                    {isCompleted && <Check className="h-4 w-4" />}
                  </div>
                );
              })}
            </div>
            <div className="mt-auto text-xs text-muted-foreground">
              Need a break? Closing the browser keeps your progress. Come back anytime to finish onboarding.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingFlow;


