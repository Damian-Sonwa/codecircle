import React, {type ReactNode, useEffect, createContext, useContext, useState, useRef} from 'react';
import {useAuthStore} from '@/store/authStore';
import {useNotificationStore} from '@/store/notificationStore';
import {connectSocket, disconnectSocket, getSocket} from '@/services/socket';

interface SocketContextValue {
  socket: any;
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
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
  const user = useAuthStore((state) => state.user);
  const pushNotification = useNotificationStore((state) => state.push);
  const [socketState, setSocketState] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [appReady, setAppReady] = useState(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 5;

  // Wait for app to be ready (auth + onboarding) before initializing socket
  useEffect(() => {
    const onboardingComplete = user?.onboardingCompleted || 
                               user?.hasOnboarded || 
                               user?.profileCompleted ||
                               user?.role === 'admin' ||
                               user?.role === 'superadmin';
    
    const ready = !!(accessToken && user && onboardingComplete);
    setAppReady(ready);
  }, [accessToken, user]);

  useEffect(() => {
    // CRITICAL: Only initialize socket when app is ready (token exists AND onboarding complete)
    if (!appReady || !accessToken) {
      disconnectSocket();
      setSocketState(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
      retryCountRef.current = 0;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      return;
    }

    const connectWithRetry = () => {
      console.log('[SocketProvider] Initializing socket - app is ready');
      setConnectionStatus('connecting');
      
      const newSocket = connectSocket();
      setSocketState(newSocket);
      
      if (!newSocket) {
        handleConnectionError();
        return;
      }
      
      const handleConnect = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        retryCountRef.current = 0;
        console.log('[SocketProvider] Socket connected');
        
        // Show success notification only after retry
        if (retryCountRef.current > 0) {
          pushNotification({
            id: `socket-reconnected-${Date.now()}`,
            title: 'Reconnected',
            message: 'Chat connection restored',
            type: 'success',
          });
        }
      };
      
      const handleDisconnect = (reason: string) => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        console.log('[SocketProvider] Socket disconnected:', reason);
        
        // Only show notification if it wasn't intentional
        if (reason !== 'io client disconnect') {
          pushNotification({
            id: `socket-disconnected-${Date.now()}`,
            title: 'Connection Lost',
            message: 'Chat connection interrupted. Reconnecting...',
            type: 'warning',
          });
          
          // Attempt to reconnect
          attemptReconnect();
        }
      };
      
      const handleConnectError = (error: Error) => {
        console.error('[SocketProvider] Connection error:', error);
        setConnectionStatus('error');
        handleConnectionError();
      };
      
      newSocket.on('connect', handleConnect);
      newSocket.on('disconnect', handleDisconnect);
      newSocket.on('connect_error', handleConnectError);
      
      // Check initial connection status
      if (newSocket.connected) {
        handleConnect();
      }
      
      return () => {
        newSocket.off('connect', handleConnect);
        newSocket.off('disconnect', handleDisconnect);
        newSocket.off('connect_error', handleConnectError);
        if (newSocket) {
          newSocket.disconnect();
        }
      };
    };

    const handleConnectionError = () => {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000); // Exponential backoff, max 30s
        
        console.log(`[SocketProvider] Retrying connection (${retryCountRef.current}/${maxRetries}) in ${delay}ms`);
        
        retryTimeoutRef.current = setTimeout(() => {
          connectWithRetry();
        }, delay);
      } else {
        console.error('[SocketProvider] Max retries reached. Connection failed.');
        setConnectionStatus('error');
        pushNotification({
          id: `socket-error-${Date.now()}`,
          title: 'Connection Failed',
          message: 'Unable to connect to chat. Please refresh the page.',
          type: 'error',
        });
      }
    };

    const attemptReconnect = () => {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        
        retryTimeoutRef.current = setTimeout(() => {
          connectWithRetry();
        }, delay);
      }
    };

    connectWithRetry();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      disconnectSocket();
    };
  }, [appReady, accessToken, pushNotification]);

  // Get current socket on each render to ensure we have the latest
  const currentSocket = getSocket() || socketState;

  return (
    <SocketContext.Provider value={{socket: currentSocket, isConnected, connectionStatus}}>
      {children}
    </SocketContext.Provider>
  );
};


