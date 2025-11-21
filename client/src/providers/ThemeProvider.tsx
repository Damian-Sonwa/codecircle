import {type ReactNode, useEffect} from 'react';
import {useUIStore} from '@/store/uiStore';

interface Props {
  children: ReactNode;
}

export const ThemeProvider = ({children}: Props) => {
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
  }, [theme]);

  return <>{children}</>;
};


