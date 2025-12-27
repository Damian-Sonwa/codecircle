import {io} from 'socket.io-client';
import {useAuthStore} from '@/store/authStore';
import {useChatStore} from '@/store/chatStore';
import {type Status} from '@/types';

let socket: any;

// Get socket.io server URL - same logic as API base URL
const getSocketURL = () => {
  const VITE_API_URL = import.meta.env.VITE_API_URL;
  if (VITE_API_URL) {
    // Remove /api suffix if present, socket.io doesn't need it
    return VITE_API_URL.replace(/\/api$/, '');
  }
  // Default to localhost:4000 for development
  return 'http://localhost:4000';
};

export const connectSocket = () => {
  const {accessToken} = useAuthStore.getState();
  if (!accessToken) {
    console.warn('[Socket] No access token available, cannot connect');
    return undefined;
  }

  // If socket already exists and is connected, return it
  if (socket && socket.connected) {
    console.log('[Socket] Reusing existing connected socket');
    return socket;
  }

  // Disconnect existing socket if it exists but isn't connected
  if (socket) {
    console.log('[Socket] Disconnecting existing socket before creating new one');
    socket.disconnect();
    socket = undefined;
  }

  const socketURL = getSocketURL();
  console.log('[Socket] Connecting to:', socketURL);

  socket = io(socketURL, {
    withCredentials: true,
    auth: {token: accessToken},
    transports: ['websocket', 'polling'],
    reconnection: false, // We handle reconnection manually in SocketProvider
    autoConnect: true,
  });

  const {setTyping} = useChatStore.getState();
  const {setStatus} = useAuthStore.getState();

  // Handle connection events
  socket.on('connect', () => {
    console.log('[Socket] Connected successfully');
    const {user} = useAuthStore.getState();
    if (user && user.userId) {
      // Emit user:join to authenticate with backend
      socket.emit('user:join', {
        userId: user.userId,
        username: user.username || user.email || 'User',
      });
      console.log('[Socket] Emitted user:join for userId:', user.userId);
    }
  });

  socket.on('connect_error', (error: Error) => {
    console.error('[Socket] Connection error:', error);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('error', (error: any) => {
    console.error('[Socket] Socket error:', error);
  });

  socket.on('presence:update', (payload: any) => {
    const {userId, status, lastSeen} = payload;
    const {user} = useAuthStore.getState();
    if (user && user._id === userId) {
      setStatus(status as Status, lastSeen);
    }
  });

  socket.on('typing:start', (payload: any) => {
    const {conversationId, userId} = payload;
    setTyping(conversationId, userId, true);
  });

  socket.on('typing:stop', (payload: any) => {
    const {conversationId, userId} = payload;
    setTyping(conversationId, userId, false);
  });

  return socket;
};

export const getSocket = (): any => socket;

export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket] Disconnecting socket');
    socket.removeAllListeners(); // Remove all event listeners
    socket.disconnect();
    socket = undefined;
  }
};

export const sendMessage = (socket: any, payload: any) => {
  if (socket) {
    socket.emit('message:send', payload);
  }
};

export const joinConversation = (socket: any, conversationId: any) => {
  if (socket) {
    socket.emit('conversation:join', {conversationId});
  }
};

export const subscribeToEvent = (socket: any, event: string, handler: any) => {
  if (socket) {
    socket.on(event, handler);
  }
};


