import {type ReactNode, useEffect} from 'react';
import {useAuthStore} from '@/store/authStore';
import {connectSocket, disconnectSocket} from '@/services/socket';

interface Props {
  children: ReactNode;
}

export const SocketProvider = ({children}: Props) => {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }
    const socket = connectSocket();
    return () => {
      socket?.disconnect();
    };
  }, [accessToken]);

  return <>{children}</>;
};


