import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {type AuthResponse, type Status, type User} from '@/types';

interface AuthState {
  user: User | null;
  accessToken?: string;
  refreshToken?: string;
  setAuth: (payload: AuthResponse) => void;
  setStatus: (status: Status, lastSeen?: string) => void;
  updateTokens: (accessToken: string, refreshToken?: string) => void;
  updateUser: (user: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: undefined,
      refreshToken: undefined,
      setAuth: (payload) => {
        // Handle both response formats:
        // 1. New format: {user, tokens: {accessToken, refreshToken}}
        // 2. Legacy format: {userId, username, role, token, ...}
        if (payload.tokens) {
          // New format
          set({
            user: payload.user,
            accessToken: payload.tokens?.accessToken,
            refreshToken: payload.tokens?.refreshToken
          });
        } else if (payload.token || payload.userId) {
          // Legacy format - convert to new format
          const user = payload.user || {
            userId: payload.userId,
            username: payload.username,
            role: payload.role,
            onboardingCompleted: payload.onboardingCompleted,
            email: payload.email,
            online: payload.online,
            lastSeen: payload.lastSeen
          };
          set({
            user,
            accessToken: payload.token,
            refreshToken: payload.refreshToken
          });
        } else {
          console.error('[AuthStore] Invalid auth payload:', payload);
          throw new Error('Invalid authentication response format');
        }
      },
      setStatus: (status, lastSeen) =>
        set((state) =>
          state.user
            ? {
                user: {
                  ...state.user,
                  status,
                  lastSeen: lastSeen ?? state.user.lastSeen
                }
              }
            : state
        ),
      updateTokens: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken
        })),
      updateUser: (userPatch) =>
        set((state) =>
          state.user
            ? {
                user: {
                  ...state.user,
                  ...userPatch
                }
              }
            : state
        ),
      clearAuth: () => set({user: null, accessToken: undefined, refreshToken: undefined})
    }),
    {name: 'glasschat-auth'}
  )
);

