// DEMO-ONLY session handling.
// The backend returns a random session id from POST /api/auth/demo-login.
// This is NOT real authentication or authorization. Every access rule is enforced by the backend;
// the frontend only remembers who logged in so it can pick the right portal and send the header.
//
// sessionStorage is used on purpose: each browser tab has its own session, so you can keep
// Vendor A, Vendor B and Internal open side by side in different tabs.

const KEY = 'dip.demoSession';

export const DEMO_ACCOUNTS = {
  INTERNAL: [{ username: 'admin', password: 'admin123', label: 'Internal Admin' }],
  VENDOR: [
    { username: 'vendor_a', password: 'vendor123', label: 'Vendor A' },
    { username: 'vendor_b', password: 'vendor123', label: 'Vendor B' },
  ],
};

export function saveSession(response) {
  const session = {
    sessionId: response.sessionId,
    username: response.username,
    role: response.role,
    vendorId: response.vendorId ?? null,
  };
  sessionStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}

// 'INTERNAL' | 'VENDOR' | null
export function portalOf(role) {
  if (role === 'INTERNAL') return 'INTERNAL';
  if (role === 'VENDOR_A' || role === 'VENDOR_B') return 'VENDOR';
  return null;
}

export function homePathFor(role) {
  const portal = portalOf(role);
  if (portal === 'INTERNAL') return '/internal';
  if (portal === 'VENDOR') return '/vendor';
  return '/';
}

export function vendorLabel(role) {
  if (role === 'VENDOR_A') return 'Vendor A';
  if (role === 'VENDOR_B') return 'Vendor B';
  return '';
}

// The single place that builds auth headers. To move to JWT later, change only this function
// (e.g. return { Authorization: `Bearer ${session.token}` }).
export function authHeaders() {
  const session = getSession();
  return session ? { 'X-Demo-Session': session.sessionId } : {};
}
