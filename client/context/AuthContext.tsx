import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as service from "../lib/auth";
import type { UserRole } from "../../shared/api";

export type AuthContextType = {
  user: service.AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string, role?: UserRole, otp?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<service.AuthUser | null>(null);

  useEffect(() => {
    // We no longer need to call ensureSeedUsers as users are managed by the backend
    // service.ensureSeedUsers(); 
    setUser(service.getCurrentUser());
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    async signIn(email, password) {
      const u = await service.signIn(email, password);
      setUser(u);
    },
    async signUp(email, password, name, role, otp) {
      const u = await service.signUp(email, password, name, role, otp);
      setUser(u);
    },
    async signOut() {
      await service.signOut();
      setUser(null);
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
