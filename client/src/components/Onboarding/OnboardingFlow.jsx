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

const OnboardingFlow = ({ initialState, onUpdate, onComplete, visible, onClose, onTourStart }) => {
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
    if (!user) return undefined;
    if (currentStep?.key !== 'groups') return undefined;
    if (formData.groups.autoJoined) return undefined;

    let cancelled = false;
    let timeoutId = null;

    const joinWelcomeGroup = async () => {
      setIsProcessing(true);
      console.log('[Onboarding] Starting welcome group join process');
      
      try {
        const group = await ensureGroupAndJoin(WELCOME_GROUP_NAME);
        if (!cancelled && group && group.groupId) {
          setFormData((prev) => ({
            ...prev,
            groups: {
              ...prev.groups,
              autoJoined: true,
              welcomeGroupId: group.groupId,
            },
          }));
          console.log('[Onboarding] Welcome group joined successfully');
        } else if (!cancelled) {
          console.warn('[Onboarding] Welcome group join returned null, but continuing');
          // Mark as joined anyway to prevent infinite retries
          setFormData((prev) => ({
            ...prev,
            groups: {
              ...prev.groups,
              autoJoined: true,
              welcomeGroupId: null,
            },
          }));
        }
      } catch (error) {
        console.error('[Onboarding] Error joining welcome group:', error);
        if (!cancelled) {
          // Mark as joined to prevent blocking
          setFormData((prev) => ({
            ...prev,
            groups: {
              ...prev.groups,
              autoJoined: true,
              welcomeGroupId: null,
            },
          }));
        }
      } finally {
        if (!cancelled) {
          setIsProcessing(false);
        }
      }
    };

    // Add a timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (!formData.groups.autoJoined && !cancelled) {
        console.warn('[Onboarding] Welcome group join timeout, marking as complete');
        setFormData((prev) => ({
          ...prev,
          groups: {
            ...prev.groups,
            autoJoined: true,
            welcomeGroupId: null,
          },
        }));
        setIsProcessing(false);
      }
    }, 10000); // 10 second timeout

    joinWelcomeGroup();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentStep?.key, formData.groups.autoJoined, user]);

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
    if (!user) {
      console.error('[Onboarding] No user available for joining group');
      return null;
    }
    
    try {
      console.log(`[Onboarding] Ensuring group exists: ${groupName}`);
      
      // First, try to find existing group
      let group =
        groupsRef.current.find(
          (item) => item.name.toLowerCase() === groupName.toLowerCase()
        ) ?? null;

      // If not found, try to create it
      if (!group) {
        console.log(`[Onboarding] Group not found, creating: ${groupName}`);
        try {
          const created = await techGroupsAPI.create({
            name: groupName,
            createdBy: user.userId,
            description: 'Welcome to CodeCircle! This is your starting point.',
            type: 'community',
            topics: ['Welcome', 'Getting Started']
          });
          if (created && created.groupId) {
            group = created;
            setGroups((prev) => [...prev, created]);
            console.log(`[Onboarding] Group created successfully: ${created.groupId}`);
          } else {
            console.error('[Onboarding] Group creation returned invalid data:', created);
          }
        } catch (createError) {
          console.error('[Onboarding] Failed to create group:', createError);
          // Try to find it again in case it was created by another process
          const allGroups = await techGroupsAPI.list();
          group = allGroups.find(
            (item) => item.name.toLowerCase() === groupName.toLowerCase()
          ) ?? null;
        }
      }

      // Join the group if we have it
      if (group && group.groupId) {
        console.log(`[Onboarding] Joining group: ${group.groupId}`);
        try {
          await techGroupsAPI.join(group.groupId, user.userId);
          if (socket && socket.connected) {
            socket.emit('group:join', {
              groupId: group.groupId,
              userId: user.userId,
            });
          }
          console.log(`[Onboarding] Successfully joined group: ${group.groupId}`);
          return group;
        } catch (joinError) {
          console.error('[Onboarding] Failed to join group:', joinError);
          // If join fails but group exists, return it anyway
          return group;
        }
      } else {
        console.error('[Onboarding] No group available to join');
        return null;
      }
    } catch (error) {
      console.error(`[Onboarding] Failed to ensure tech group ${groupName}:`, error);
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
    if (stepIndex === 0) {
      // On welcome page, allow going back to auth by closing onboarding
      if (onClose) {
        onClose();
      } else if (onComplete) {
        // Call onComplete with a flag to indicate user wants to go back
        onComplete({ cancelled: true, goBackToAuth: true });
      }
      return;
    }
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
      if (!motivation || !motivation.trim() || !recentWin || !recentWin.trim()) {
        setErrorMessage(
          'Share a quick motivation and a recent win before continuing.'
        );
        return;
      }
      // Ensure the data is properly formatted for POST
      if (!formData.verification.motivation || !formData.verification.recentWin) {
        setErrorMessage('Please fill in both fields before continuing.');
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
        // Ensure all required data is present
        const payload = {
          skills: formData.skills || [],
          skillLevel: formData.level || 'Beginner',
          answers: formData.verification || {
            motivation: '',
            recentWin: ''
          }
        };
        
        console.log('[Onboarding] Submitting onboarding completion:', payload);
        const response = await api.post(endpoints.onboarding.complete, payload);
        console.log('[Onboarding] Successfully completed onboarding via API', response.data);
        apiSuccess = true;
      } catch (apiError) {
        console.error('[Onboarding] Failed to complete onboarding via API:', apiError);
        console.error('[Onboarding] Error details:', {
          message: apiError.message,
          response: apiError.response?.data,
          status: apiError.response?.status
        });
        // Show error but continue to update local state
        pushNotification({
          id: 'onboarding-api-error',
          title: 'Warning',
          message: apiError.response?.data?.error || 'Onboarding saved locally, but server sync failed. Please refresh.',
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
        console.log('[Onboarding] Calling onComplete callback with payload:', payload);
        onComplete(payload);
      } else {
        // Fallback: Navigation is handled here when no callback is provided
        // Wait for state to stabilize before navigating
        setTimeout(() => {
          const user = useAuthStore.getState().user;
          // Double-check that onboarding is actually complete before navigating
          if (user?.hasOnboarded && user?.profileCompleted && user?.onboardingCompleted) {
            const redirectPath = (user?.role === 'admin' || user?.role === 'superadmin') ? '/admin' : '/dashboard';
            console.log('[Onboarding] Navigating to', redirectPath);
            navigate(redirectPath, { replace: true });
          } else {
            console.warn('[Onboarding] User state not fully updated, waiting...');
            // Retry after a bit more time if state isn't ready
            setTimeout(() => {
              const retryUser = useAuthStore.getState().user;
              if (retryUser?.hasOnboarded && retryUser?.profileCompleted && retryUser?.onboardingCompleted) {
                const redirectPath = (retryUser?.role === 'admin' || retryUser?.role === 'superadmin') ? '/admin' : '/dashboard';
                navigate(redirectPath, { replace: true });
              }
            }, 500);
          }
        }, 500);
      }
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
    <div className="flex flex-col items-center text-center gap-4 sm:gap-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="relative"
      >
        <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-3xl" />
        <motion.div
          animate={{ rotate: [0, 12, -8, 0] }}
          transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
        >
          <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 text-sky-500 drop-shadow-lg" />
        </motion.div>
      </motion.div>
      <div className="space-y-2 sm:space-y-3">
        <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
          Welcome to CodeCircle!
        </h2>
        <p className="text-base sm:text-sm text-gray-600 dark:text-gray-300 max-w-xl">
          Learn. Chat. Grow. We tailor your experience from day one so every
          connection and resource amplifies your goals.
        </p>
      </div>
      <div className="rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-slate-800/60 backdrop-blur-sm p-3 sm:p-4 flex flex-col gap-2">
        <div className="flex items-start gap-2 text-sm sm:text-xs text-gray-600 dark:text-gray-300">
          <ShieldCheck className="h-4 w-4 sm:h-3 sm:w-3 text-sky-500 flex-shrink-0 mt-0.5" />
          <span>Your responses shape recommendations, communities, and events.</span>
        </div>
        <div className="flex items-start gap-2 text-sm sm:text-xs text-gray-600 dark:text-gray-300">
          <Compass className="h-4 w-4 sm:h-3 sm:w-3 text-sky-500 flex-shrink-0 mt-0.5" />
          <span>Pick interests, join specialized groups, and unlock guided tours.</span>
        </div>
      </div>
    </div>
  );

  const renderSkills = () => (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h3 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">Pick your focus areas</h3>
        <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-300">
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
              className={`rounded-lg px-4 py-2.5 sm:px-4 sm:py-2 text-base sm:text-sm font-medium transition-all border min-h-[44px] touch-manipulation ${
                isSelected
                  ? 'bg-sky-500 text-white border-sky-500 shadow-lg shadow-sky-500/30'
                  : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
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
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h3 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">How would you describe your current level?</h3>
        <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-300">
          We use this to tailor resources, peers, and learning paths.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
              className={`rounded-lg sm:rounded-xl border p-4 sm:p-4 text-left transition-all hover:shadow-md min-h-[44px] touch-manipulation ${
                active
                  ? 'bg-sky-500 text-white border-sky-500 shadow-xl shadow-sky-500/40'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="text-lg sm:text-lg font-semibold">{option.title}</div>
              <p className="text-sm sm:text-xs mt-2 sm:mt-2 opacity-80">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderVerification = () => (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h3 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">
          A quick check before we connect you
        </h3>
        <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-300">
          Your responses help moderators keep communities focused and supportive.
        </p>
      </div>
      <div className="grid gap-3 sm:gap-4">
        <div className="space-y-2">
          <label className="text-sm sm:text-xs font-medium text-gray-700 dark:text-gray-200">
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
            className="w-full rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-3 sm:p-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 min-h-[44px] touch-manipulation"
            placeholder="Share the goal or challenge you're working on."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm sm:text-xs font-medium text-gray-700 dark:text-gray-200">
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
            className="w-full rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 p-3 sm:p-3 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 min-h-[44px] touch-manipulation"
            placeholder="A shipped feature, passed exam, hackathon, etc."
          />
        </div>
      </div>
    </div>
  );

  const renderGroups = () => (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1 sm:gap-2">
        <h3 className="text-xl sm:text-2xl font-semibold">Communities unlocked</h3>
        <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-300">
          You&apos;re already part of the CodeCircle Welcome Lounge. Choose a few skill-based
          groups to get started with peers.
        </p>
      </div>
      <div className="rounded-xl sm:rounded-2xl border border-sky-500/40 bg-sky-500/10 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Users className="h-8 w-8 sm:h-10 sm:w-10 text-sky-500 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-base sm:text-lg">CodeCircle Welcome Lounge</div>
            <p className="text-sm sm:text-xs text-sky-500/90">
              Introduce yourself and meet the community team.
            </p>
          </div>
        </div>
        <div className="text-sm sm:text-xs font-medium text-sky-500 flex-shrink-0">
          {formData.groups.autoJoined ? (
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 sm:h-4 sm:w-4" />
              Joined
            </span>
          ) : isProcessing ? (
            <span className="flex items-center gap-1">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-sky-500 border-t-transparent rounded-full"
              />
              Connecting...
            </span>
          ) : (
            'Ready'
          )}
        </div>
      </div>
      <div className="grid gap-2 sm:gap-3">
        {filteredGroupSuggestions.map((group) => {
          const selected = formData.groups.selectedSuggestions.includes(
            group.name
          );
          return (
            <button
              key={group.name}
              type="button"
              onClick={() => toggleSuggestedGroup(group.name)}
              className={`flex flex-col items-start rounded-xl sm:rounded-2xl border p-3 sm:p-4 transition-all text-left ${
                selected
                  ? 'border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-sky-500/50 bg-white dark:bg-slate-800'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{group.name}</span>
                {selected && <Check className="h-3 w-3 sm:h-4 sm:w-4 text-sky-500" />}
              </div>
              <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-300 mt-1">
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
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-xl sm:rounded-2xl border border-sky-500/30 bg-white dark:bg-slate-800/80 p-4 sm:p-6 shadow-lg shadow-sky-500/10">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500" />
            <span className="uppercase text-xs sm:text-xs tracking-wide text-sky-500 font-semibold">
              Guided tour
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-gray-900 dark:text-gray-100">{activeTour.title}</h3>
          <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-300">
            {activeTour.description}
          </p>
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 text-sm sm:text-xs text-gray-500 dark:text-gray-400">
            <span>
              Highlighting: <strong className="text-sky-500">{activeTour.title}</strong>
            </span>
            <span>
              Step {tourIndex + 1} / {TOUR_STEPS.length}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleTourPrev}
            disabled={tourIndex === 0 || isProcessing}
            className="text-base sm:text-sm min-h-[44px] touch-manipulation"
          >
            <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            Back
          </Button>
          {tourIndex < TOUR_STEPS.length - 1 ? (
            <Button onClick={handleTourNext} disabled={isProcessing} className="text-xs sm:text-sm">
              Next highlight
              <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          ) : (
            <Button 
              onClick={handleFinish} 
              disabled={isProcessing}
              className="min-w-[140px] text-xs sm:text-sm"
            >
              {isProcessing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="mr-2 h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full"
                  />
                  Finishing...
                </>
              ) : (
                <>
                  Finish onboarding
                  <Check className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                </>
              )}
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

  // Handle visibility prop (for compatibility with AppLayout)
  // If visible is provided and false, don't render
  if (visible !== undefined && !visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-3 sm:px-4 py-4 sm:py-6 overflow-y-auto">
      {/* Close button - visible on welcome page */}
      {stepIndex === 0 && (
        <button
          onClick={() => {
            console.log('[Onboarding] Close button clicked, going back to auth');
            if (onClose) {
              onClose();
            } else if (onComplete) {
              onComplete({ cancelled: true, goBackToAuth: true });
            }
          }}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 rounded-full bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-900 border border-gray-200 dark:border-gray-700 p-2 transition-all active:scale-95 shadow-lg"
          aria-label="Close onboarding"
          type="button"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-5xl my-auto"
      >
        <div className="grid gap-3 sm:gap-4 md:gap-6 rounded-xl sm:rounded-2xl md:rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 shadow-2xl shadow-sky-500/10 backdrop-blur-xl p-3 sm:p-4 md:p-6 md:grid-cols-[2fr,1fr]">
          <div className="flex flex-col min-w-0">
            <div className="mb-4 sm:mb-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <span className="text-xs sm:text-xs uppercase tracking-wide font-semibold text-sky-500">
                  Step {stepIndex + 1} of {STEP_ORDER.length}
                </span>
                <span className="text-sm sm:text-xs font-medium text-gray-500 dark:text-gray-400">
                  {currentStep?.label}
                </span>
              </div>
              <div className="mt-2 sm:mt-3 h-1.5 sm:h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-sky-500 transition-all"
                  style={{ width: `${completionProgress}%` }}
                />
              </div>
            </div>

            <div className="flex-1 min-h-0">
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
              <div className="mt-3 sm:mt-4 rounded-xl border border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-900/20 p-3 sm:p-3 text-sm sm:text-xs text-rose-600 dark:text-rose-400">
                {errorMessage}
              </div>
            )}

            {!isFinalStep && (
              <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (stepIndex === 0 && onClose) {
                      onClose();
                    } else {
                      handlePrevious();
                    }
                  }}
                  disabled={isProcessing}
                  className="text-base sm:text-sm min-h-[44px] touch-manipulation"
                >
                  <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {stepIndex === 0 ? 'Back to Login' : 'Back'}
                </Button>
                <Button onClick={handleNext} disabled={isProcessing} className="text-base sm:text-sm min-h-[44px] touch-manipulation">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-4 sm:w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="hidden md:flex rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-800/60 p-4 flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 text-sky-500" />
                Onboarding checklist
              </div>
              <p className="mt-1 text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
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
                    className={`flex items-center justify-between rounded-xl border px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm transition-all ${
                      isCompleted
                        ? 'border-sky-500/60 bg-sky-500/10 text-sky-500'
                        : isActive
                        ? 'border-sky-500/50 bg-white dark:bg-slate-900'
                        : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-slate-900/70 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <span>{step.label}</span>
                    {isCompleted && <Check className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </div>
                );
              })}
            </div>
            <div className="mt-auto text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
              Need a break? Closing the browser keeps your progress. Come back anytime to finish onboarding.
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingFlow;


