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
      setAuth: ({user, tokens}) =>
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }),
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

