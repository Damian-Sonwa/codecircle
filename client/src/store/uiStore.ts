import {create} from 'zustand';
import {persist} from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface UIState {
  theme: ThemeMode;
  ambientBackground: boolean;
  soundEnabled: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleAmbient: () => void;
  toggleSound: () => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      ambientBackground: true,
      soundEnabled: true,
      settingsOpen: false,
      setTheme: (theme) => set({theme}),
      toggleAmbient: () => set((state) => ({ambientBackground: !state.ambientBackground})),
      toggleSound: () => set((state) => ({soundEnabled: !state.soundEnabled})),
      setSettingsOpen: (open) => set({settingsOpen: open})
    }),
    {name: 'glasschat-ui'}
  )
);

