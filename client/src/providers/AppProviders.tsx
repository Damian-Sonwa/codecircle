import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {type ReactNode, useState} from 'react';
import {ThemeProvider} from './ThemeProvider';
import {SocketProvider} from './SocketProvider';
import {AuthProvider} from '../contexts/AuthContext';

interface Props {
  children: ReactNode;
}

export const AppProviders = ({children}: Props) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};


