// src/lib/api.ts
const API_BASE = '/api';

const getToken = (): string | null => {
  try { return localStorage.getItem('authToken'); }
  catch { return null; }
};

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.headers) Object.assign(headers, options.headers);

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers, credentials: 'include' });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.msg || errorData.message || `HTTP ${response.status}`);
  }
  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════
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

  // ── WebAuthn: Registration ──────────────────────────────────────────────
  async webauthnRegisterStart(email: string) {
    return fetchAPI('/auth/webauthn/register/start', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async webauthnRegisterFinish(email: string, credential: any) {
    return fetchAPI('/auth/webauthn/register/finish', {
      method: 'POST',
      body: JSON.stringify({ email, credential }),
    });
  },

  // ── WebAuthn: Authentication ────────────────────────────────────────────
  async webauthnAuthStart(email: string) {
    return fetchAPI('/auth/webauthn/authenticate/start', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async webauthnAuthFinish(userId: string, credential: any) {
    return fetchAPI('/auth/webauthn/authenticate/finish', {
      method: 'POST',
      body: JSON.stringify({ userId, credential }),
    });
  },

  async checkFingerprint() {
    return fetchAPI('/auth/webauthn/check');
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
export const dashboardAPI = {
  async getStats() {
    return fetchAPI('/dashboard/stats');
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MEMBERS
// ═══════════════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════════════════════════════════
function buildRoomFormData(roomData: Record<string, any>, imageFile?: File | null): FormData {
  const fd = new FormData();
  for (const [key, val] of Object.entries(roomData)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      fd.append(key, JSON.stringify(val));
    } else {
      fd.append(key, String(val));
    }
  }
  if (imageFile) fd.append('directionImage', imageFile);
  return fd;
}

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
    return fetchFormData('/rooms', 'POST', buildRoomFormData(roomData, imageFile));
  },
  async update(id: string, roomData: Record<string, any>, imageFile?: File | null) {
    return fetchFormData(`/rooms/${id}`, 'PUT', buildRoomFormData(roomData, imageFile));
  },
  async delete(id: string) {
    return fetchAPI(`/rooms/${id}`, { method: 'DELETE' });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// REQUESTS
// ═══════════════════════════════════════════════════════════════════════════
export const requestsAPI = {
  async getAll() {
    return fetchAPI('/requests');
  },
  async getAllRequests() {
    return fetchAPI('/requests/all');
  },
  async getPendingReturns() {
    return fetchAPI('/requests/pending-returns');
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
  async approveReturn(id: string) {
    return fetchAPI(`/requests/${id}/approve-return`, { method: 'PATCH' });
  },
  async rejectReturn(id: string) {
    return fetchAPI(`/requests/${id}/reject-return`, { method: 'PATCH' });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════════════
export const reportsAPI = {
  async getAll() {
    return fetchAPI('/reports');
  },
  async create(reportData: { title: string; roomCode: string; description?: string; priority?: string }) {
    return fetchAPI('/reports', {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  },
};

export default {
  auth: authAPI,
  dashboard: dashboardAPI,
  members: membersAPI,
  rooms: roomsAPI,
  requests: requestsAPI,
  reports: reportsAPI,
};