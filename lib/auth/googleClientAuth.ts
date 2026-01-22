/**
 * Google Identity Services (GIS) client-side authentication
 * This is UI-only authentication for demo purposes (not secure)
 */

export type SessionUser = {
  email: string;
  name: string;
  picture?: string;
};

export type Session = {
  currentEmail: string;
  users: Record<string, SessionUser>;
};

const SESSION_KEY = "ns_session_v1";

/**
 * Load Google Identity Services script
 */
export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Not in browser"));
      return;
    }

    // Check if already loaded
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        reject(new Error("Google Identity Services failed to load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google Sign-In
 */
export function initGoogleSignIn({
  clientId,
  onSuccess,
  onError,
}: {
  clientId: string;
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
}): void {
  if (typeof window === "undefined") return;

  loadGoogleScript()
    .then(() => {
      if (!window.google?.accounts?.id) {
        onError?.("Google Identity Services not available");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          if (response.credential) {
            onSuccess(response.credential);
          } else {
            onError?.("No credential received");
          }
        },
      });
    })
    .catch((err) => {
      onError?.(err.message || "Failed to initialize Google Sign-In");
    });
}

/**
 * Decode JWT token (base64url decode)
 */
export function decodeJwt(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    // Decode payload (second part)
    const payload = parts[1];
    // Replace URL-safe base64 characters
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    // Add padding if needed
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${error}`);
  }
}

/**
 * Get current session
 */
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save session
 */
export function saveSession(session: Session): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Get current user from session
 */
export function getCurrentUser(): SessionUser | null {
  const session = getSession();
  if (!session) return null;
  return session.users[session.currentEmail] || null;
}

/**
 * Add or update user in session
 */
export function setUser(user: SessionUser): void {
  const session = getSession() || { currentEmail: user.email, users: {} };
  session.users[user.email] = user;
  session.currentEmail = user.email;
  saveSession(session);
}

/**
 * Set current user email
 */
export function setCurrentEmail(email: string): void {
  const session = getSession();
  if (!session) return;
  if (!session.users[email]) return;
  session.currentEmail = email;
  saveSession(session);
}

/**
 * Clear session (logout)
 */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
