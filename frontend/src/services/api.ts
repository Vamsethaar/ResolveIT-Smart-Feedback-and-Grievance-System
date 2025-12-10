import type { AuthResponse, FeedbackPayload, FeedbackStatusItem, User, OfficerRating } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: HeadersInit = {
    'Accept': 'application/json'
  };
  // Only set Content-Type if there's a body and it's not FormData
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  // Ensure token is valid before adding to headers
  if (token && token.trim()) {
    headers['Authorization'] = `Bearer ${token.trim()}`;
  } else if (!path.includes('/auth/') && !path.includes('/files/upload') && !path.includes('/officer/') && !path.includes('/rating')) {
    // If token is required but missing, throw error
    // Allow public endpoints: /auth/, /files/upload, and /officer/*/rating
    throw new Error('Authentication required. Please log in again.');
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    // Friendly auth error for wrong credentials
    if ((res.status === 401 || res.status === 403) && path.includes('/auth/login')) {
      throw new Error('Invalid email or password');
    }
    // Do NOT auto-logout on 401/403; surface the error to the UI instead
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  // @ts-expect-error allow empty return
  return undefined;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  registerCitizen: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register/citizen', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    }),

  // Profile
  updateProfile: (token: string, name: string, password?: string) =>
    request<User>('/me', {
      method: 'PUT',
      body: JSON.stringify({ name, password })
    }, token),

  // Feedback
  submitFeedback: (token: string, payload: FeedbackPayload) =>
    request<{ id: string }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(payload)
    }, token),

  uploadPhoto: async (token: string, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`
    };
    const res = await fetch(`${API_BASE_URL}/files/upload`, {
      method: 'POST',
      body: formData,
      headers
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const url = await res.text();
    // If URL is relative, make it absolute by prepending API base URL without /api
    return url.startsWith('http') ? url : `${API_BASE_URL.replace('/api', '')}${url}`;
  },

  // Citizen status
  myFeedback: (token: string) =>
    request<FeedbackStatusItem[]>('/feedback/my', {}, token),

  escalateGrievance: (token: string, id: number) =>
    request<any>(`/feedback/${id}/escalate`, {
      method: 'POST',
      body: JSON.stringify({})
    }, token),
  withdrawFeedback: (token: string, id: number) =>
    request<any>(`/feedback/${id}/withdraw`, { method: 'POST' }, token),
  deleteFeedback: (token: string, id: number) =>
    request<void>(`/feedback/${id}`, { method: 'DELETE' }, token),

  // Admin
  adminUsers: (token: string) =>
    request<User[]>('/admin/users', {}, token),
  adminOfficers: (token: string) =>
    request<User[]>('/admin/officers', {}, token),
  adminFeedbacks: (token: string) =>
    request<any[]>('/admin/feedbacks', {}, token),
  adminAssignFeedback: (token: string, id: number, officerId: number) =>
    request<void>(`/admin/feedbacks/${id}/assign?officerId=${encodeURIComponent(String(officerId))}`,
      { method: 'PUT' }, token),
  adminAssignDeadline: (token: string, id: number, deadline: string) =>
    request<any>(`/admin/feedbacks/${id}/deadline`, {
      method: 'PUT',
      body: JSON.stringify({ deadline })
    }, token),
  adminSendMessage: (token: string, id: number, message: string) =>
    request<any>(`/admin/feedbacks/${id}/message`, {
      method: 'PUT',
      body: JSON.stringify({ message })
    }, token),
  adminCounts: (token: string) =>
    request<{ unresolved: number; assigned: number; rejected: number; total: number }>(
      '/admin/feedbacks/counts', {}, token),
  adminStatistics: (token: string) =>
    request<any>('/admin/feedbacks/statistics', {}, token),
  adminCreateUser: (token: string, payload: { name: string; email: string; password: string; role: 'ADMIN'|'OFFICER'|'CITIZEN' }) =>
    request<User>('/admin/users', { method: 'POST', body: JSON.stringify(payload) }, token),
  adminUpdateUser: (token: string, id: number, payload: { name: string; email: string; role?: 'ADMIN'|'OFFICER'|'CITIZEN'; password?: string }) =>
    request<User>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }, token),
  adminDeleteUser: (token: string, id: number) =>
    request<void>(`/admin/users/${id}`, { method: 'DELETE' }, token),

  // Officer
  officerAssigned: (token: string) =>
    request<any[]>('/feedback/assigned', {}, token),
  officerCounts: (token: string) =>
    request<{ unresolved: number; assigned: number; rejected: number; total: number }>(
      '/feedback/assigned/counts', {}, token),
  officerUpdateStatus: (token: string, id: number, status: 'SUBMITTED'|'IN_PROGRESS'|'RESOLVED'|'REJECTED'|'ESCALATED') =>
    request<any>(`/feedback/${id}/status?status=${encodeURIComponent(status)}`, { method: 'PUT' }, token),
  officerStatistics: (token: string) =>
    request<any>('/feedback/statistics', {}, token),

  // Rating
  submitRating: (token: string, id: number, rating: number, comment?: string) =>
    request<any>(`/feedback/${id}/rating`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment: comment || '' })
    }, token),
  getOfficerRating: (email: string) =>
    request<{ officerEmail: string; averageRating: number | null; totalRatings: number }>(
      `/feedback/officer/${encodeURIComponent(email)}/rating`, {}, undefined)
};


