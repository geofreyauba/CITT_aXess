// src/lib/api.ts
const API_BASE = '/api';   // Uses Vite proxy (port 5173 → backend port)

// Helper to get JWT from localStorage
const getToken = (): string | null => {
  try {
    return localStorage.getItem('authToken');
  } catch {
    return null;
  }
};

// Core fetch helper with logging for debugging
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

  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  console.log(`→ Fetching ${options.method || 'GET'} ${url}`);
  if (token) console.log('→ With token:', token.substring(0, 10) + '...');

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    const text = await response.text().catch(() => 'No response body');
    console.warn('Non-JSON response:', text);
    throw new Error(`Server returned invalid JSON: ${text}`);
  }

  if (!response.ok) {
    console.warn(`Request failed: ${response.status} ${response.statusText}`);
    throw new Error(data?.msg || data?.message || `HTTP ${response.status}`);
  }

  return data;
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
    // FormData → do NOT set Content-Type header
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
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

  async getById(id: string) {
    return fetchAPI(`/members/${id}`);
  },

  async approve(id: string) {
    return fetchAPI(`/members/${id}/approve`, { method: 'PATCH' });
  },

  async reject(id: string) {
    return fetchAPI(`/members/${id}/reject`, { method: 'PATCH' });
  },

  async delete(id: string) {
    return fetchAPI(`/members/${id}`, { method: 'DELETE' });
  },

  async update(id: string, data: any) {
    return fetchAPI(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Not needed as separate method since you use direct fetch in handleAddMember
  // async createManual(payload: any) {
  //   return fetchAPI('/members/manual', {
  //     method: 'POST',
  //     body: JSON.stringify(payload),
  //   });
  // },
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

// Export all APIs
export default {
  auth: authAPI,
  dashboard: dashboardAPI,
  members: membersAPI,
  rooms: roomsAPI,
  requests: requestsAPI,
};