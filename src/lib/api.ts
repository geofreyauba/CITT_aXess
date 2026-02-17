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

// Core fetch helper — JSON only (no files)
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

  async delete(id: string) {
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
// ── Uses FormData so we can include an image file alongside text fields ──
// =============================================

/** Build a FormData from a plain room object + optional image file */
function buildRoomFormData(roomData: Record<string, any>, imageFile?: File | null): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(roomData)) {
    if (val === undefined || val === null) continue;
    // Arrays must be serialised as JSON strings (multer receives them as text)
    if (Array.isArray(val)) {
      fd.append(key, JSON.stringify(val));
    } else {
      fd.append(key, String(val));
    }
  }
  if (imageFile) {
    fd.append('directionImage', imageFile);
  }
  return fd;
}

/** Fetch helper that accepts FormData (no Content-Type header — browser sets it with boundary) */
async function fetchFormData(endpoint: string, method: 'POST' | 'PUT', formData: FormData) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.msg || errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const roomsAPI = {
  async getAll() {
    return fetchAPI('/rooms');
  },

  async create(roomData: Record<string, any>, imageFile?: File | null) {
    const fd = buildRoomFormData(roomData, imageFile);
    return fetchFormData('/rooms', 'POST', fd);
  },

  async update(id: string, roomData: Record<string, any>, imageFile?: File | null) {
    const fd = buildRoomFormData(roomData, imageFile);
    return fetchFormData(`/rooms/${id}`, 'PUT', fd);
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

  // Admin: get ALL requests from all users (for Reports page)
  async getAllRequests() {
    return fetchAPI('/requests/all');
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