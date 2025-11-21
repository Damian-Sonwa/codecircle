import axios from 'axios';
import {useAuthStore} from '@/store/authStore';
import {useNotificationStore} from '@/store/notificationStore';

// Use VITE_API_URL in production, fallback to /api for development (proxy)
// VITE_API_URL should be the full base URL including /api if needed
// Examples:
//   - https://codecircle-uc8r.onrender.com/api (recommended)
//   - https://codecircle-uc8r.onrender.com (will append /api in endpoints)
const VITE_API_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = VITE_API_URL || '/api';

// Determine if base URL already includes /api
const baseUrlHasApi = API_BASE_URL.endsWith('/api') || API_BASE_URL.includes('/api/');

// Log API base URL for debugging
console.log('[API] Base URL:', API_BASE_URL);
console.log('[API] VITE_API_URL:', VITE_API_URL);
console.log('[API] Base URL includes /api:', baseUrlHasApi);

// Warn if API base URL is not set in production
if (import.meta.env.PROD && !VITE_API_URL) {
  console.warn('[API] WARNING: VITE_API_URL is not set in production! API calls may fail.');
  console.warn('[API] Please set VITE_API_URL in your Netlify environment variables.');
}

// Helper to build endpoint paths
// If baseURL already includes /api, don't add it again
const endpoint = (path: string) => {
  // If baseURL ends with /api, remove /api from the path
  if (baseUrlHasApi && path.startsWith('/api')) {
    const cleaned = path.replace(/^\/api/, '');
    // Ensure path starts with /
    return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
  }
  return path;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const {accessToken} = useAuthStore.getState();
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log 404 errors for debugging
    if (error.response?.status === 404) {
      console.error('[API] 404 Error - Endpoint not found');
      console.error('[API] Request URL:', error.config?.url);
      console.error('[API] Base URL:', API_BASE_URL);
      console.error('[API] Full config:', error.config);
      console.error('[API] Make sure the server is running on port 4000 (for local dev)');
    }
    if (error.response?.status === 401) {
      const {refreshToken, updateTokens, clearAuth, user} = useAuthStore.getState();
      if (!refreshToken) {
        clearAuth();
        return Promise.reject(error);
      }
      try {
        const refreshPath = endpoint('/api/auth/refresh');
        const refresh = await axios.post(`${API_BASE_URL}${refreshPath}`, {refreshToken}, {withCredentials: true});
        const newAccess = refresh.data.accessToken;
        if (user) {
          updateTokens(newAccess, refreshToken);
        }
        error.config.headers.Authorization = `Bearer ${newAccess}`;
        return api.request(error.config);
      } catch (refreshError) {
        clearAuth();
        return Promise.reject(refreshError);
      }
    }
    if (error.response?.status === 423) {
      const push = useNotificationStore.getState().push;
      push({
        id: `locked-${Date.now()}`,
        title: 'Conversation locked',
        message: 'An administrator has temporarily locked this conversation.'
      });
    }
    return Promise.reject(error);
  }
);

export const endpoints = {
  auth: {
    signup: endpoint('/api/auth/signup'),
    login: endpoint('/api/auth/login'),
    logout: endpoint('/api/auth/logout'),
    me: endpoint('/api/users/me')
  },
  conversations: endpoint('/api/conversations'),
  messages: (conversationId: string) => endpoint(`/api/conversations/${conversationId}/messages`),
  messageReactions: (conversationId: string, messageId: string) => endpoint(`/api/conversations/${conversationId}/messages/${messageId}/reactions`),
  users: {
    search: endpoint('/api/users/search'),
    presence: (userId: string) => endpoint(`/api/users/${userId}/presence`),
    friends: endpoint('/api/users/friends'),
    summary: (userId: string) => endpoint(`/api/users/${userId}/summary`)
  },
  onboarding: {
    complete: endpoint('/api/onboarding'),
    tourComplete: endpoint('/api/onboarding/tour-complete')
  },
  friends: {
    invite: endpoint('/api/friends/invite'),
    accept: (code: string) => endpoint(`/api/friends/invite/${code}/accept`),
    request: endpoint('/api/friends/request'),
    respond: (requesterId: string) => endpoint(`/api/friends/request/${requesterId}/respond`)
  },
  classrooms: {
    root: endpoint('/api/classrooms'),
    sessions: (classroomId: string) => endpoint(`/api/classrooms/${classroomId}/sessions`),
    register: (classroomId: string, sessionId: string) => endpoint(`/api/classrooms/${classroomId}/sessions/${sessionId}/register`)
  },
  knowledge: {
    root: endpoint('/api/knowledge'),
    bookmark: (id: string) => endpoint(`/api/knowledge/${id}/bookmark`),
    like: (id: string) => endpoint(`/api/knowledge/${id}/like`),
    comment: (id: string) => endpoint(`/api/knowledge/${id}/comment`),
    leaderboard: endpoint('/api/knowledge/leaderboard')
  },
  admin: {
    analytics: endpoint('/api/admin/analytics'),
    suspendUser: (userId: string) => endpoint(`/api/admin/users/${userId}/suspend`),
    deleteUser: (userId: string) => endpoint(`/api/admin/users/${userId}`),
    deleteMessage: (messageId: string) => endpoint(`/api/admin/messages/${messageId}`),
    lockConversation: (conversationId: string) => endpoint(`/api/admin/conversations/${conversationId}/lock`),
    unlockConversation: (conversationId: string) => endpoint(`/api/admin/conversations/${conversationId}/unlock`)
  }
};

