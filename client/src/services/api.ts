import axios from 'axios';
import {useAuthStore} from '@/store/authStore';
import {useNotificationStore} from '@/store/notificationStore';

// Use explicit baseURL for development - direct connection to backend
// In production, set VITE_API_URL environment variable
const VITE_API_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = VITE_API_URL || 'http://localhost:4000/api';

// Log API base URL for debugging
console.log('[API] Base URL:', API_BASE_URL);
console.log('[API] VITE_API_URL:', VITE_API_URL);

// Warn if API base URL is not set in production
if (import.meta.env.PROD && !VITE_API_URL) {
  console.warn('[API] WARNING: VITE_API_URL is not set in production! API calls may fail.');
  console.warn('[API] Please set VITE_API_URL in your environment variables.');
}

// Helper to build endpoint paths - paths should already include /api prefix
// Since baseURL is "http://localhost:4000/api", we need to remove /api from paths
const endpoint = (path: string) => {
  // Remove /api prefix since baseURL already includes it
  if (path.startsWith('/api')) {
    return path.replace(/^\/api/, '');
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

// Extract user-friendly error message from response
const extractErrorMessage = (error: any): string => {
  // Check for standardized error response format
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Fallback to error field (legacy format)
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Network errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. Please check your connection and try again.';
  }
  
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return 'Unable to connect to the server. Check your internet connection.';
  }
  
  // HTTP status code based messages
  const status = error.response?.status;
  switch (status) {
    case 400:
      return error.response?.data?.message || 'Invalid request. Please check your input.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This item already exists.';
    case 422:
      return 'Validation error. Please check your input.';
    case 423:
      return 'This resource is currently locked.';
    case 500:
    case 502:
    case 503:
      return 'Something went wrong on our end. Please try again later.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const errorMessage = extractErrorMessage(error);
    const errorCode = error.response?.data?.code;
    const errorField = error.response?.data?.field;
    
    // Log errors for debugging (but don't expose to user)
    console.error('[API] Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: errorMessage,
      code: errorCode,
      field: errorField,
    });
    
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      const {refreshToken, updateTokens, clearAuth, user} = useAuthStore.getState();
      if (!refreshToken) {
        clearAuth();
        // Don't show notification for auth errors - let the component handle it
        return Promise.reject(error);
      }
      try {
        const refreshPath = endpoint('/api/auth/refresh');
        const refresh = await api.post(refreshPath, {refreshToken});
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
    
    // Handle 403 - Forbidden (show notification)
    if (error.response?.status === 403) {
      const push = useNotificationStore.getState().push;
      push({
        id: `error-${Date.now()}`,
        title: 'Access Denied',
        message: errorMessage,
        type: 'error',
      });
    }
    
    // Handle 423 - Locked conversation
    if (error.response?.status === 423) {
      const push = useNotificationStore.getState().push;
      push({
        id: `locked-${Date.now()}`,
        title: 'Conversation Locked',
        message: 'An administrator has temporarily locked this conversation.',
        type: 'warning',
      });
    }
    
    // Handle 500+ - Server errors (show notification)
    if (error.response?.status >= 500) {
      const push = useNotificationStore.getState().push;
      push({
        id: `server-error-${Date.now()}`,
        title: 'Server Error',
        message: errorMessage,
        type: 'error',
      });
    }
    
    // Attach extracted message to error for component-level handling
    error.userMessage = errorMessage;
    error.errorCode = errorCode;
    error.errorField = errorField;
    
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
  conversations: {
    list: endpoint('/api/conversations'),
    create: endpoint('/api/conversations'),
  },
  privateCircles: {
    list: endpoint('/api/private-circles'),
    create: endpoint('/api/private-circles'),
    get: (circleId: string) => endpoint(`/api/private-circles/${circleId}`),
    addMembers: (circleId: string) => endpoint(`/api/private-circles/${circleId}/members`),
    removeMember: (circleId: string, memberId: string) => endpoint(`/api/private-circles/${circleId}/members/${memberId}`),
    delete: (circleId: string) => endpoint(`/api/private-circles/${circleId}`),
  },
  messages: (conversationId: string) => endpoint(`/api/conversations/${conversationId}/messages`),
  messageReactions: (conversationId: string, messageId: string) => endpoint(`/api/conversations/${conversationId}/messages/${messageId}/reactions`),
  users: {
    search: endpoint('/api/users/search'),
    presence: (userId: string) => endpoint(`/api/users/${userId}/presence`),
    friends: endpoint('/api/users/friends'),
    summary: (userId: string) => endpoint(`/api/users/${userId}/summary`)
  },
  onboarding: {
    complete: endpoint('/api/onboarding/complete'),
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
    stats: endpoint('/api/admin/stats'),
    users: endpoint('/api/admin/users'),
    createUser: endpoint('/api/admin/users'),
    user: (userId: string) => endpoint(`/api/admin/users/${userId}`),
    updateUser: (userId: string) => endpoint(`/api/admin/users/${userId}`),
    suspendUser: (userId: string) => endpoint(`/api/admin/users/${userId}/suspend`),
    restoreUser: (userId: string) => endpoint(`/api/admin/users/${userId}/reinstate`),
    deleteUser: (userId: string) => endpoint(`/api/admin/users/${userId}`),
    updateUserRole: (userId: string) => endpoint(`/api/admin/users/${userId}/role`),
    mentors: endpoint('/api/admin/mentors'),
    classes: endpoint('/api/admin/classes'),
    approvals: endpoint('/api/admin/approvals'),
    techGroups: endpoint('/api/admin/tech-groups'),
    deleteMessage: (messageId: string) => endpoint(`/api/admin/messages/${messageId}`),
    lockConversation: (conversationId: string) => endpoint(`/api/admin/conversations/${conversationId}/lock`),
    unlockConversation: (conversationId: string) => endpoint(`/api/admin/conversations/${conversationId}/unlock`),
    liveSessionApplications: endpoint('/api/admin/live-sessions/applications'),
    approveApplication: (applicationId: string) => endpoint(`/api/admin/live-sessions/applications/${applicationId}/approve`),
    rejectApplication: (applicationId: string) => endpoint(`/api/admin/live-sessions/applications/${applicationId}/reject`)
  },
  liveSessions: {
    apply: endpoint('/api/live-sessions/apply'),
    applicationStatus: endpoint('/api/live-sessions/application/status'),
    room: (roomId: string) => endpoint(`/api/live-sessions/rooms/${roomId}`)
  }
};

