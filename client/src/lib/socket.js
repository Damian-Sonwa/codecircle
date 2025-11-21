import { io } from 'socket.io-client';

// In dev, use localhost:5000 directly since Socket.io needs direct connection
// In production, use env var or same origin
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:5000' : undefined);

let socket = null;

export const initSocket = (userId, username) => {
  if (socket) {
    socket.disconnect();
  }
  
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    socket.emit('user:join', { userId, username });
  });
  
  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });
  
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });
  
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

