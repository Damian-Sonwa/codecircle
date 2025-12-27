import axios from 'axios';
import {useAuthStore} from '@/store/authStore';

// Use explicit baseURL for development - direct connection to backend
// In production, set VITE_API_URL environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Set to true if using cookies
  timeout: 30000, // 30 second timeout
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const {accessToken} = useAuthStore.getState();
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      const {clearAuth} = useAuthStore.getState();
      clearAuth();
    }
    return Promise.reject(error);
  }
);

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const authAPI = {
  register: async (username, email, password) => {
    const response = await api.post('/auth/signup', { username, email, password }, { withCredentials: true });
    return response.data;
  },
  
  login: async (identifier, password) => {
    const response = await api.post('/auth/login', { identifier, password }, { withCredentials: true });
    return response.data;
  },
  
  logout: async () => {
    // Clear local storage
    localStorage.removeItem('user');
    return { success: true };
  },
};

export const usersAPI = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
};

export const techGroupsAPI = {
  list: async (search) => {
    const response = await api.get('/tech-groups', {
      params: search ? { search } : undefined,
    });
    return response.data;
  },

  create: async ({ name, createdBy, description, topics, type }) => {
    const payload = {
      name,
      createdBy,
      description,
      topics,
      type,
    };
    const response = await api.post('/tech-groups', payload);
    return response.data;
  },

  update: async (groupId, updates) => {
    const response = await api.patch(`/tech-groups/${groupId}`, updates);
    return response.data;
  },

  remove: async (groupId) => {
    await api.delete(`/tech-groups/${groupId}`);
    return { success: true };
  },

  getById: async (groupId) => {
    const response = await api.get(`/tech-groups/${groupId}`);
    return response.data;
  },

  join: async (groupId, userId) => {
    const response = await api.post(`/tech-groups/${groupId}/members`, {
      userId,
    });
    return response.data;
  },

  submitJoinRequest: async (groupId, payload) => {
    const response = await api.post(`/tech-groups/${groupId}/join-requests`, payload);
    return response.data;
  },

  listJoinRequests: async (groupId) => {
    const response = await api.get(`/tech-groups/${groupId}/join-requests`);
    return response.data;
  },
  
  // Assessment endpoints
  getAssessmentStatus: async (groupId) => {
    const response = await api.get(`/tech-groups/${groupId}/assessment/status`);
    return response.data;
  },
  
  getAssessmentQuestions: async (groupId, count = 7) => {
    const response = await api.get(`/tech-groups/${groupId}/assessment/questions`, {
      params: {count}
    });
    return response.data;
  },
  
  submitAssessment: async (groupId, answers, questions) => {
    // Normalize slug (groupId might be a slug like "api-artisans")
    const normalizedSlug = typeof groupId === 'string' 
      ? groupId.toLowerCase().trim().replace(/\s+/g, '-')
      : groupId;
    
    const response = await api.post(`/tech-groups/${normalizedSlug}/assessment/submit`, {
      answers,
      level: questions?.[0]?.level || 'Beginner' // Extract level from questions if available
    });
    return response.data;
  },

  approveJoinRequest: async (groupId, requestId) => {
    const response = await api.post(
      `/tech-groups/${groupId}/join-requests/${requestId}/approve`
    );
    return response.data;
  },

  declineJoinRequest: async (groupId, requestId) => {
    const response = await api.post(
      `/tech-groups/${groupId}/join-requests/${requestId}/decline`
    );
    return response.data;
  },

  leave: async (groupId, userId) => {
    await api.delete(`/tech-groups/${groupId}/members/${userId}`);
    return { success: true };
  },

  getArchivedMessages: async (groupId) => {
    const response = await api.get(`/tech-groups/${groupId}/messages/archived`);
    return response.data;
  },

  archiveMessage: async (groupId, messageId) => {
    const response = await api.post(`/tech-groups/${groupId}/messages/${messageId}/archive`);
    return response.data;
  },

};

export const friendsAPI = {
  list: async () => {
    const response = await api.get('/friends');
    return response.data;
  },
  listByUser: async (userId) => {
    const response = await api.get(`/friends/${userId}`);
    return response.data;
  },
  sendRequest: async (targetUsername) => {
    const response = await api.post('/friends/request', { targetUsername });
    return response.data;
  },
  sendRequestById: async (targetUserId) => {
    const response = await api.post(`/friends/add/${targetUserId}`);
    return response.data;
  },
  respond: async (requesterId, action) => {
    const response = await api.post('/friends/respond', { requesterId, action });
    return response.data;
  },
  accept: async (requesterId) => {
    const response = await api.post(`/friends/accept/${requesterId}`);
    return response.data;
  },
  decline: async (requesterId) => {
    const response = await api.delete(`/friends/decline/${requesterId}`);
    return response.data;
  },
};

export const classroomAPI = {
  listMine: async () => {
    const response = await api.get('/classroom-requests');
    return response.data;
  },
  createRequest: async ({ name, description }) => {
    const response = await api.post('/classroom-requests', { name, description });
    return response.data;
  },
  listAll: async () => {
    const response = await api.get('/admin/classroom-requests');
    return response.data;
  },
  approve: async (requestId) => {
    const response = await api.post(`/admin/classroom-requests/${requestId}/approve`);
    return response.data;
  },
  decline: async (requestId, adminNotes) => {
    const response = await api.post(`/admin/classroom-requests/${requestId}/decline`, {
      adminNotes,
    });
    return response.data;
  },
};

export const onboardingAPI = {
  complete: async () => {
    const response = await api.post('/onboarding/complete');
    return response.data;
  },
};

export const adminAPI = {
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  suspendUser: async (userId, reason) => {
    const response = await api.post(`/admin/users/${userId}/suspend`, { reason });
    return response.data;
  },
  reinstateUser: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/reinstate`);
    return response.data;
  },
  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },
  getLogs: async (limit = 20) => {
    const response = await api.get('/admin/logs', { params: { limit } });
    return response.data;
  },
  getViolations: async (limit = 50) => {
    const response = await api.get('/admin/violations', { params: { limit } });
    return response.data;
  },
  updateRole: async (userId, role) => {
    const response = await api.post(`/admin/users/${userId}/role`, { role });
    return response.data;
  },
};

export const uploadsAPI = {
  upload: async ({ fileName, contentType, data, scope = 'attachments' }) => {
    const response = await api.post('/uploads', {
      fileName,
      contentType,
      data,
      scope,
    });
    return response.data;
  },
};

export const translatorAPI = {
  translate: async ({ text, target }) => {
    const response = await api.post('/translate', { text, target });
    return response.data;
  },
};

