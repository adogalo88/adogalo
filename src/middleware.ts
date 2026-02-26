import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "adogalo-super-secret-key-2024";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "aplikasipunyowongkito@gmail.com";

// Simple JWT verification for middleware
async function verifyToken(token: string): Promise<{ email: string; role: string; projectId?: string } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());

    // Check if token is expired
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Check if email is admin
function isAdminEmail(email: string): boolean {
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie
  const token = request.cookies.get("token")?.value;

  // Public routes - no authentication required
  const publicRoutes = ["/", "/login", "/verify-otp", "/manager", "/admin/login", "/admin/verify-otp"];
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith("/api/auth/");

  // API routes - handle separately
  if (pathname.startsWith("/api/")) {
    // Auth routes are public
    if (pathname.startsWith("/api/auth/")) {
      return NextResponse.next();
    }

    // Other API routes require authentication
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    // Add user info to headers for API routes
    const response = NextResponse.next();
    response.headers.set("x-user-email", payload.email);
    response.headers.set("x-user-role", payload.role);
    if (payload.projectId) {
      response.headers.set("x-project-id", payload.projectId);
    }

    return response;
  }

  // Public routes - allow access
  if (isPublicRoute) {
    // If user is logged in and tries to access login page, redirect to dashboard
    if (token && publicRoutes.includes(pathname)) {
      const payload = await verifyToken(token);
      if (payload) {
        // Redirect based on role
        if (payload.role === "admin" || isAdminEmail(payload.email)) {
          return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
        if (payload.projectId) {
          return NextResponse.redirect(new URL(`/project/${payload.projectId}`, request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    // Clear invalid token
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.delete("token");
    return response;
  }

  // Admin routes - require admin role
  if (pathname.startsWith("/admin/") && payload.role !== "admin" && !isAdminEmail(payload.email)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Project routes - check access
  if (pathname.startsWith("/project/")) {
    const projectId = pathname.split("/")[2];

    // Admin has access to all projects
    if (payload.role === "admin" || isAdminEmail(payload.email)) {
      const response = NextResponse.next();
      response.headers.set("x-project-id", projectId);
      return response;
    }

    // Check if user has access to this project
    if (payload.projectId !== projectId && payload.role !== "manager") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js)
     * - favicon.ico (static assets)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon\\.ico|public).*)",
  ],
};
