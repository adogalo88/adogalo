import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { db } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "adogalo-super-secret-key-2024";

export interface TokenPayload {
  email: string;
  role: "admin" | "manager" | "client" | "vendor";
  projectId?: string;
  userId?: string;
}

export interface Session {
  email: string;
  role: "admin" | "manager" | "client" | "vendor";
  projectId?: string;
  userId?: string;
}

// Generate JWT Token
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

// Verify JWT Token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// Get session from request (cookies or headers)
export async function getSession(request?: NextRequest): Promise<Session | null> {
  try {
    // Try to get token from cookies first
    const cookieStore = await cookies();
    let token = cookieStore.get("token")?.value;

    // If no cookie, try Authorization header
    if (!token && request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    return {
      email: payload.email,
      role: payload.role,
      projectId: payload.projectId,
      userId: payload.userId,
    };
  } catch {
    return null;
  }
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

// Clear auth cookie
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("token");
}

// Check if email is admin
export function isAdmin(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL || "aplikasipunyowongkito@gmail.com";
  return email.toLowerCase().trim() === adminEmail.toLowerCase().trim();
}

// Get user role based on email and project
export async function getUserRole(
  email: string,
  projectId?: string
): Promise<"admin" | "manager" | "client" | "vendor" | null> {
  // Check if admin
  if (isAdmin(email)) {
    return "admin";
  }

  // Check if manager in database
  const user = await db.user.findUnique({
    where: { email },
  });

  if (user) {
    // Check if manager has access to this project
    if (projectId && user.role === "manager") {
      const projectIds = JSON.parse(user.projectIds || "[]");
      if (projectIds.includes(projectId)) {
        return "manager";
      }
    }
    return user.role as "manager";
  }

  // Check if client or vendor in project
  if (projectId) {
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (project) {
      if (project.clientEmail === email) {
        return "client";
      }
      if (project.vendorEmail === email) {
        return "vendor";
      }
    }
  }

  return null;
}
