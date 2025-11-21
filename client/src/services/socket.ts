import {io} from 'socket.io-client';
import {useAuthStore} from '@/store/authStore';
import {useChatStore} from '@/store/chatStore';
import {type Status} from '@/types';

let socket: any;

export const connectSocket = () => {
  const {accessToken} = useAuthStore.getState();
  if (!accessToken) return undefined;

  socket = io('/', {
    withCredentials: true,
    auth: {token: accessToken}
  });

  const {setTyping} = useChatStore.getState();
  const {setStatus} = useAuthStore.getState();

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


