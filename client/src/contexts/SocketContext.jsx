import React, { createContext, useContext, useEffect, useState } from 'react';
import { initSocket, getSocket, disconnectSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user) {
      const newSocket = initSocket(user.userId, user.username);
      setSocket(newSocket);

      return () => {
        disconnectSocket();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected: socket?.connected }}>
      {children}
    </SocketContext.Provider>
  );
};





