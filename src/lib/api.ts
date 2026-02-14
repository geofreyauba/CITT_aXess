// src/lib/api.ts
const API_BASE = '/api';   // ← Uses Vite proxy (port 5173 → 5000)

// Helper to get JWT from localStorage
const getToken = (): string | null => {
  try {
    return localStorage.getItem('authToken');
  } catch {
    return null;
  }
};

// Core fetch helper
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.msg || errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// =============================================
// AUTH
// =============================================
export const authAPI = {
  async login(email: string, password: string) {
    return fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(formData: FormData) {
    const token = getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.msg || 'Registration failed');
    }

    return response.json();
  },
};

// =============================================
// DASHBOARD
// =============================================
export const dashboardAPI = {
  async getStats() {
    return fetchAPI('/dashboard/stats');
  },
};

// =============================================
// MEMBERS
// =============================================
export const membersAPI = {
  async getAll() {
    return fetchAPI('/members');
  },

  async approve(id: string) {
    return fetchAPI(`/members/${id}/approve`, { method: 'PATCH' });
  },

  async reject(id: string) {
    return fetchAPI(`/members/${id}/reject`, { method: 'PATCH' });
  },

  async delete(id: string) {           // ← This was missing → fixed the error in Members.tsx
    return fetchAPI(`/members/${id}`, { method: 'DELETE' });
  },

  async update(id: string, data: any) {
    return fetchAPI(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// =============================================
// ROOMS
// =============================================
export const roomsAPI = {
  async getAll() {
    return fetchAPI('/rooms');
  },

  async create(roomData: any) {
    return fetchAPI('/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  },

  async update(id: string, roomData: any) {
    return fetchAPI(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    });
  },

  async delete(id: string) {
    return fetchAPI(`/rooms/${id}`, { method: 'DELETE' });
  },
};

// =============================================
// REQUESTS
// =============================================
export const requestsAPI = {
  async getAll() {
    return fetchAPI('/requests');
  },

  async create(requestData: any) {
    return fetchAPI('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  },

  async returnRequest(id: string) {
    return fetchAPI(`/requests/${id}/return`, { method: 'PATCH' });
  },
};

// =============================================
// REPORTS (if you add real reports route later)
// =============================================
// export const reportsAPI = { ... };

export default {
  auth: authAPI,
  dashboard: dashboardAPI,
  members: membersAPI,
  rooms: roomsAPI,
  requests: requestsAPI,
};