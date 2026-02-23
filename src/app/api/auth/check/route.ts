import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "aplikasipunyowongkito@gmail.com";

// Check if email is admin
function isAdminEmail(email: string): boolean {
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json({
        loggedIn: false,
      });
    }

    // Check if this is an admin
    if (session.role === "admin" || isAdminEmail(session.email)) {
      return NextResponse.json({
        loggedIn: true,
        user: {
          email: session.email,
          role: "admin",
          projectId: null,
          userId: session.userId,
        },
      });
    }

    // For non-admin users with a projectId, verify the project still exists
    if (session.projectId) {
      const project = await db.project.findUnique({
        where: { id: session.projectId },
        select: { id: true },
      });

      if (!project) {
        // Project no longer exists, clear session
        const response = NextResponse.json({
          loggedIn: false,
        });
        response.cookies.delete("token");
        return response;
      }
    }

    return NextResponse.json({
      loggedIn: true,
      user: {
        email: session.email,
        role: session.role,
        projectId: session.projectId,
        userId: session.userId,
      },
    });
  } catch {
    return NextResponse.json({
      loggedIn: false,
    });
  }
}
