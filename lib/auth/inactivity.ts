export const AUTH_INACTIVITY_MS = 30 * 60 * 1000;

function key(userId: string) {
  return `leadscout:last-activity:${userId}`;
}

export function readLastActivity(userId: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const value = Number(window.localStorage.getItem(key(userId)));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function recordAuthActivity(userId: string, timestamp = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(userId), String(timestamp));
  } catch {
    // Browsers can disable storage. The in-memory provider timer still applies.
  }
}

export function isAuthInactive(lastActivity: number, timestamp = Date.now()) {
  return timestamp - lastActivity >= AUTH_INACTIVITY_MS;
}

export function authActivityStorageKey(userId: string) {
  return key(userId);
}
