import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY_PREFIX = 'chaturway_skill_profile';

const getStorageKey = (userId) => `${STORAGE_KEY_PREFIX}_${userId}`;

const loadProfile = (userId) => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to parse stored skill profile. Resetting.', error);
    localStorage.removeItem(getStorageKey(userId));
    return null;
  }
};

const persistProfile = (userId, profile) => {
  if (!userId) return;
  localStorage.setItem(getStorageKey(userId), JSON.stringify(profile));
};

const DEFAULT_PROFILE = {
  interests: [],
  lastCompletedSkillId: null,
  levelHistory: {},
  assessments: {},
  updatedAt: null,
};

export const useUserSkillProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile = DEFAULT_PROFILE } = useQuery({
    queryKey: ['skill-profile', user?.userId],
    enabled: Boolean(user?.userId),
    queryFn: () => loadProfile(user.userId) ?? { ...DEFAULT_PROFILE },
    staleTime: Infinity,
    initialData: { ...DEFAULT_PROFILE },
  });

  const mutation = useMutation({
    mutationFn: async (updates) => {
      if (!user?.userId) return profile;
      const current = loadProfile(user.userId) ?? { ...DEFAULT_PROFILE };
      const nextProfile = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      persistProfile(user.userId, nextProfile);
      return nextProfile;
    },
    onSuccess: (nextProfile) => {
      queryClient.setQueryData(['skill-profile', user?.userId], nextProfile);
    },
  });

  const updateProfile = (updates) => mutation.mutate(updates);

  return {
    profile,
    updateProfile,
    isUpdating: mutation.isLoading,
  };
};





