import axios from 'axios';

// Use proxy in development (relative URL), or env var in production
const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Set to true if using cookies
  timeout: 30000, // 30 second timeout
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const authAPI = {
  register: async (username, email, password) => {
    const response = await api.post('/api/auth/signup', { username, email, password }, { withCredentials: true });
    return response.data;
  },
  
  login: async (identifier, password) => {
    const response = await api.post('/api/auth/login', { identifier, password }, { withCredentials: true });
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
    const response = await api.get('/api/users');
    return response.data;
  },
};

export const techGroupsAPI = {
  list: async (search) => {
    const response = await api.get('/api/tech-groups', {
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
    const response = await api.post('/api/tech-groups', payload);
    return response.data;
  },

  update: async (groupId, updates) => {
    const response = await api.patch(`/api/tech-groups/${groupId}`, updates);
    return response.data;
  },

  remove: async (groupId) => {
    await api.delete(`/api/tech-groups/${groupId}`);
    return { success: true };
  },

  getById: async (groupId) => {
    const response = await api.get(`/api/tech-groups/${groupId}`);
    return response.data;
  },

  join: async (groupId, userId) => {
    const response = await api.post(`/api/tech-groups/${groupId}/members`, {
      userId,
    });
    return response.data;
  },

  submitJoinRequest: async (groupId, payload) => {
    const response = await api.post(`/api/tech-groups/${groupId}/join-requests`, payload);
    return response.data;
  },

  listJoinRequests: async (groupId) => {
    const response = await api.get(`/api/tech-groups/${groupId}/join-requests`);
    return response.data;
  },

  approveJoinRequest: async (groupId, requestId) => {
    const response = await api.post(
      `/api/tech-groups/${groupId}/join-requests/${requestId}/approve`
    );
    return response.data;
  },

  declineJoinRequest: async (groupId, requestId) => {
    const response = await api.post(
      `/api/tech-groups/${groupId}/join-requests/${requestId}/decline`
    );
    return response.data;
  },

  leave: async (groupId, userId) => {
    await api.delete(`/api/tech-groups/${groupId}/members/${userId}`);
    return { success: true };
  },

  getArchivedMessages: async (groupId) => {
    const response = await api.get(`/api/tech-groups/${groupId}/messages/archived`);
    return response.data;
  },

  archiveMessage: async (groupId, messageId) => {
    const response = await api.post(`/api/tech-groups/${groupId}/messages/${messageId}/archive`);
    return response.data;
  },
};

export const friendsAPI = {
  list: async () => {
    const response = await api.get('/api/friends');
    return response.data;
  },
  listByUser: async (userId) => {
    const response = await api.get(`/api/friends/${userId}`);
    return response.data;
  },
  sendRequest: async (targetUsername) => {
    const response = await api.post('/api/friends/request', { targetUsername });
    return response.data;
  },
  sendRequestById: async (targetUserId) => {
    const response = await api.post(`/api/friends/add/${targetUserId}`);
    return response.data;
  },
  respond: async (requesterId, action) => {
    const response = await api.post('/api/friends/respond', { requesterId, action });
    return response.data;
  },
  accept: async (requesterId) => {
    const response = await api.post(`/api/friends/accept/${requesterId}`);
    return response.data;
  },
  decline: async (requesterId) => {
    const response = await api.delete(`/api/friends/decline/${requesterId}`);
    return response.data;
  },
};

export const classroomAPI = {
  listMine: async () => {
    const response = await api.get('/api/classroom-requests');
    return response.data;
  },
  createRequest: async ({ name, description }) => {
    const response = await api.post('/api/classroom-requests', { name, description });
    return response.data;
  },
  listAll: async () => {
    const response = await api.get('/api/admin/classroom-requests');
    return response.data;
  },
  approve: async (requestId) => {
    const response = await api.post(`/api/admin/classroom-requests/${requestId}/approve`);
    return response.data;
  },
  decline: async (requestId, adminNotes) => {
    const response = await api.post(`/api/admin/classroom-requests/${requestId}/decline`, {
      adminNotes,
    });
    return response.data;
  },
};

export const onboardingAPI = {
  complete: async () => {
    const response = await api.post('/api/onboarding/complete');
    return response.data;
  },
};

export const adminAPI = {
  getUsers: async () => {
    const response = await api.get('/api/admin/users');
    return response.data;
  },
  suspendUser: async (userId, reason) => {
    const response = await api.post(`/api/admin/users/${userId}/suspend`, { reason });
    return response.data;
  },
  reinstateUser: async (userId) => {
    const response = await api.post(`/api/admin/users/${userId}/reinstate`);
    return response.data;
  },
  deleteUser: async (userId) => {
    const response = await api.delete(`/api/admin/users/${userId}`);
    return response.data;
  },
  getLogs: async (limit = 20) => {
    const response = await api.get('/api/admin/logs', { params: { limit } });
    return response.data;
  },
  getViolations: async (limit = 50) => {
    const response = await api.get('/api/admin/violations', { params: { limit } });
    return response.data;
  },
  updateRole: async (userId, role) => {
    const response = await api.post(`/api/admin/users/${userId}/role`, { role });
    return response.data;
  },
};

export const uploadsAPI = {
  upload: async ({ fileName, contentType, data, scope = 'attachments' }) => {
    const response = await api.post('/api/uploads', {
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
    const response = await api.post('/api/translate', { text, target });
    return response.data;
  },
};

