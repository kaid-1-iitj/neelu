import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export type UserRole = "Admin" | "Manager" | "Treasurer" | "Secretary" | "President" | "Agent";

export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
  role?: UserRole;
}

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch (error) {
    return null;
  }
}

export function requireAuth(roles?: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.header("authorization") || req.header("Authorization");

    // Demo auth mode for local testing only
    if (process.env.AUTH_DEMO === "true") {
      const demoUid = req.header("x-demo-uid") || "demo-user";
      const demoEmail = req.header("x-demo-email") || "demo@example.com";
      const demoRole = (req.header("x-demo-role") as UserRole) || "Agent";
      const user: AuthUser = { uid: demoUid, email: demoEmail, role: demoRole };
      if (roles && !roles.includes(demoRole)) {
        return res.status(403).json({ error: "Forbidden" });
      }
      (req as any).user = user;
      return next();
    }

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }

    const token = auth.split(" ")[1];
    const user = verifyToken(token);

    if (!user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (roles && user.role && !roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    (req as any).user = user;
    next();
  };
}
