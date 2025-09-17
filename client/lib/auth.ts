import type { UserRole, SignUpRequest, SignInRequest, ApiResponse } from "../../shared/api";

export type AuthUser = { uid: string; email: string; name?: string; role: UserRole };

const SESSION_KEY = "sl_session";
const TOKEN_KEY = "sl_token";

function setSession(user: AuthUser, token: string) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, token);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getCurrentUser(): AuthUser | null {
  try {
    const rawUser = localStorage.getItem(SESSION_KEY);
    const rawToken = localStorage.getItem(TOKEN_KEY);
    if (rawUser && rawToken) {
      // Optionally, you might want to verify the token with the backend here for full security
      // For simplicity, we'll just parse the stored user for now.
      return JSON.parse(rawUser) as AuthUser;
    }
    return null;
  } catch {
    return null;
  }
}

export async function signUp(
  email: string,
  password: string,
  name?: string,
  role: UserRole = "Agent",
): Promise<AuthUser> {
  const response = await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, role } as SignUpRequest),
  });
  const data: ApiResponse<{ user: AuthUser; token: string }> = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Signup failed");
  }
  setSession(data.user, data.token);
  return data.user;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const response = await fetch("/api/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password } as SignInRequest),
  });
  const data: ApiResponse<{ user: AuthUser; token: string }> = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }
  setSession(data.user, data.token);
  return data.user;
}

export async function signOut(): Promise<void> {
  clearSession();
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
