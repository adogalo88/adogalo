import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  try {
    await clearAuthCookie();
    
    return NextResponse.json({
      success: true,
      message: "Berhasil logout",
    });
  } catch (error) {
    console.error("Error logging out:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan saat logout" },
      { status: 500 }
    );
  }
}
