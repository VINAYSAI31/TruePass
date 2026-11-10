import { authHeaders, clearSession } from './auth';

export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status = 0, fieldErrors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) Object.assign(headers, authHeaders());

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(`Cannot reach the backend at ${BASE_URL}. Check that it is running and that CORS allows this origin.`);
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // Demo session unknown/expired (e.g. backend restarted): send the user back to the start.
    if (response.status === 401 && auth) {
      clearSession();
      window.location.assign('/');
    }
    throw new ApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data?.fieldErrors || null,
    );
  }
  return data;
}

function query(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.append(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

const api = {
  // Auth (demo only)
  demoLogin: (username, password) =>
    request('/api/auth/demo-login', { method: 'POST', body: { username, password }, auth: false }),

  // Internal: applications
  createApplication: (payload) => request('/api/applications', { method: 'POST', body: payload }),
  listApplications: (params) => request(`/api/applications${query(params)}`),
  getApplication: (id) => request(`/api/applications/${id}`),
  getComparison: (id) => request(`/api/applications/${id}/comparison`),

  // Internal: decisions, exceptions, dashboard, audit
  evaluateDecision: (applicationId) => request(`/api/decisions/evaluate/${applicationId}`, { method: 'POST' }),
  listExceptions: (params) => request(`/api/exceptions${query(params)}`),
  getException: (id) => request(`/api/exceptions/${id}`),
  reviewException: (id, payload) => request(`/api/exceptions/${id}/review`, { method: 'POST', body: payload }),
  dashboardSummary: () => request('/api/dashboard/summary'),
  listAuditLogs: (params) => request(`/api/audit-logs${query(params)}`),

  // Vendor
  vendorApplications: () => request('/api/vendor/applications'),
  vendorApplication: (id) => request(`/api/vendor/applications/${id}`),
  submitVendorResponse: (payload) => request('/api/vendor/responses', { method: 'POST', body: payload }),
  vendorResponses: () => request('/api/vendor/responses'),
  vendorDashboardSummary: () => request('/api/vendor/dashboard/summary'),
};

export default api;
