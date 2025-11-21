import React, {type ReactNode, useEffect, createContext, useContext, useState} from 'react';
import {useAuthStore} from '@/store/authStore';
import {connectSocket, disconnectSocket, getSocket} from '@/services/socket';

interface SocketContextValue {
  socket: any;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
}

export const SocketProvider = ({children}: Props) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [socketState, setSocketState] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      setSocketState(null);
      setIsConnected(false);
      return;
    }
    const newSocket = connectSocket();
    setSocketState(newSocket);
    setIsConnected(newSocket?.connected ?? false);
    
    if (newSocket) {
      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);
      
      newSocket.on('connect', handleConnect);
      newSocket.on('disconnect', handleDisconnect);
      
      return () => {
        newSocket.off('connect', handleConnect);
        newSocket.off('disconnect', handleDisconnect);
        if (newSocket) {
          newSocket.disconnect();
        }
      };
    }
  }, [accessToken]);

  // Get current socket on each render to ensure we have the latest
  const currentSocket = getSocket() || socketState;

  return (
    <SocketContext.Provider value={{socket: currentSocket, isConnected}}>
      {children}
    </SocketContext.Provider>
  );
};


