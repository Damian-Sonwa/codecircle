import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {type ReactNode, useState} from 'react';
import {ThemeProvider} from './ThemeProvider';
import {SocketProvider} from './SocketProvider';

interface Props {
  children: ReactNode;
}

export const AppProviders = ({children}: Props) => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SocketProvider>{children}</SocketProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};


