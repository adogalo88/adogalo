import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth";
import { notifyTerminRequestPayment, notifyTerminConfirmedPaid, notifyTerminRefundProcessed } from "@/lib/email";
import { formatCurrency } from "@/lib/financial";
import { calculateTerminAmount, CLIENT_FEE_PERCENT } from "@/lib/financial";
import { TerminClient } from "@prisma/client";

// GET - Get all termins for a project
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "Project ID diperlukan" },
        { status: 400 }
      );
    }

    const termins = await db.terminClient.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      termins,
    });
  } catch (error) {
    console.error("Error fetching termins:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// POST - Client confirms termin payment
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { terminId, action } = body;

    if (!terminId) {
      return NextResponse.json(
        { success: false, message: "Termin ID diperlukan" },
        { status: 400 }
      );
    }

    const termin = await db.terminClient.findUnique({
      where: { id: terminId },
      include: { project: true },
    });

    if (!termin) {
      return NextResponse.json(
        { success: false, message: "Termin tidak ditemukan" },
        { status: 404 }
      );
    }

    const isUserAdmin = isAdmin(session.email);
    const isClient = termin.project.clientEmail === session.email;

    switch (action) {
      case "request_payment": {
        // Client requests to pay this termin
        if (!isClient && !isUserAdmin) {
          return NextResponse.json(
            { success: false, message: "Hanya client yang bisa membayar termin" },
            { status: 403 }
          );
        }

        if (termin.status !== "unpaid") {
          return NextResponse.json(
            { success: false, message: "Termin sudah diproses" },
            { status: 400 }
          );
        }

        // Update termin status to pending_confirmation
        const updatedTermin = await db.terminClient.update({
          where: { id: terminId },
          data: { status: "pending_confirmation" },
        });

        const adminEmail = process.env.ADMIN_EMAIL || "aplikasipunyowongkito@gmail.com";
        notifyTerminRequestPayment(
          adminEmail,
          termin.project.judul,
          termin.judul,
          termin.project.clientName
        ).catch((e) => console.error("Notifikasi termin request:", e));

        return NextResponse.json({
          success: true,
          message: "Permintaan pembayaran termin berhasil dikirim",
          termin: updatedTermin,
        });
      }

      case "confirm_payment": {
        // Admin or Manager confirms that client has paid
        // Check if user is manager with access to this project
        let isManager = false;
        if (session.role === "manager" && session.userId) {
          const user = await db.user.findUnique({
            where: { id: session.userId },
          });
          if (user) {
            const projectIds = JSON.parse(user.projectIds || "[]");
            isManager = projectIds.includes(termin.projectId);
          }
        }

        if (!isUserAdmin && !isManager) {
          return NextResponse.json(
            { success: false, message: "Hanya admin atau manager yang bisa konfirmasi pembayaran termin" },
            { status: 403 }
          );
        }

        if (termin.status !== "pending_confirmation") {
          return NextResponse.json(
            { success: false, message: "Termin tidak dalam status menunggu konfirmasi" },
            { status: 400 }
          );
        }

        // Get admin data
        const adminData = await db.adminData.findUnique({
          where: { projectId: termin.projectId },
        });

        if (!adminData) {
          return NextResponse.json(
            { success: false, message: "Data admin tidak ditemukan" },
            { status: 404 }
          );
        }

        // Update admin data - add client funds
        await db.adminData.update({
          where: { projectId: termin.projectId },
          data: {
            clientFunds: { increment: termin.totalWithFee },
            adminBalance: { increment: termin.totalWithFee },
          },
        });

        // Update termin status
        const updatedTermin = await db.terminClient.update({
          where: { id: terminId },
          data: { status: "paid", paidAt: new Date() },
        });

        // Create system log
        await db.log.create({
          data: {
            projectId: termin.projectId,
            tipe: "system",
            catatan: `Termin "${termin.judul}" sebesar ${termin.totalWithFee.toLocaleString("id-ID")} telah dibayar oleh client`,
            files: "[]",
            amount: termin.feeClientAmount,
          },
        });

        notifyTerminConfirmedPaid(termin.project.clientEmail, termin.project.judul, termin.judul).catch((e) =>
          console.error("Notifikasi termin confirmed:", e)
        );

        return NextResponse.json({
          success: true,
          message: "Pembayaran termin berhasil dikonfirmasi",
          termin: updatedTermin,
        });
      }

      case "cancel_request": {
        // Client cancels payment request
        if (!isClient && !isUserAdmin) {
          return NextResponse.json(
            { success: false, message: "Tidak memiliki akses" },
            { status: 403 }
          );
        }

        if (termin.status !== "pending_confirmation") {
          return NextResponse.json(
            { success: false, message: "Termin tidak bisa dibatalkan" },
            { status: 400 }
          );
        }

        const updatedTermin = await db.terminClient.update({
          where: { id: terminId },
          data: { status: "unpaid" },
        });

        return NextResponse.json({
          success: true,
          message: "Permintaan pembayaran dibatalkan",
          termin: updatedTermin,
        });
      }

      case "process_refund": {
        // Admin/Manager memproses pengembalian dana ke client (untuk termin pengurangan pekerjaan)
        let isManager = false;
        if (session.role === "manager" && session.userId) {
          const user = await db.user.findUnique({
            where: { id: session.userId },
          });
          if (user) {
            const projectIds = JSON.parse(user.projectIds || "[]");
            isManager = projectIds.includes(termin.projectId);
          }
        }

        if (!isUserAdmin && !isManager) {
          return NextResponse.json(
            { success: false, message: "Hanya admin atau manager yang bisa memproses pengembalian dana" },
            { status: 403 }
          );
        }

        if (termin.type !== "reduction") {
          return NextResponse.json(
            { success: false, message: "Hanya termin pengurangan pekerjaan yang bisa diproses pengembalian" },
            { status: 400 }
          );
        }

        if (termin.status !== "unpaid") {
          return NextResponse.json(
            { success: false, message: "Pengembalian untuk termin ini sudah diproses" },
            { status: 400 }
          );
        }

        const adminData = await db.adminData.findUnique({
          where: { projectId: termin.projectId },
        });

        if (!adminData) {
          return NextResponse.json(
            { success: false, message: "Data admin tidak ditemukan" },
            { status: 404 }
          );
        }

        const refundAmount = Math.abs(termin.totalWithFee);
        if (adminData.clientFunds < refundAmount) {
          return NextResponse.json(
            { success: false, message: `Dana client tidak mencukupi untuk pengembalian (tersedia: ${adminData.clientFunds.toLocaleString("id-ID")}, diperlukan: ${refundAmount.toLocaleString("id-ID")})` },
            { status: 400 }
          );
        }

        await db.adminData.update({
          where: { projectId: termin.projectId },
          data: {
            clientFunds: { decrement: refundAmount },
            adminBalance: { decrement: refundAmount },
          },
        });

        const updatedTermin = await db.terminClient.update({
          where: { id: terminId },
          data: { status: "refunded" },
        });

        await db.log.create({
          data: {
            projectId: termin.projectId,
            tipe: "refund",
            catatan: `Pengembalian dana "${termin.judul}" sebesar ${refundAmount.toLocaleString("id-ID")} telah dikembalikan ke client`,
            files: "[]",
          },
        });

        notifyTerminRefundProcessed(
          termin.project.clientEmail,
          termin.project.judul,
          termin.judul,
          formatCurrency(refundAmount)
        ).catch((e) => console.error("Notifikasi termin refund:", e));

        return NextResponse.json({
          success: true,
          message: "Pengembalian dana berhasil diproses",
          termin: updatedTermin,
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: "Aksi tidak valid" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing termin action:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// PUT - Regenerate termins for a project (called when milestones change)
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session || !isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { success: false, message: "Project ID diperlukan" },
        { status: 400 }
      );
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: {
          where: { isAdditionalWork: false },
          orderBy: { urutan: "asc" },
        },
        termins: {
          where: { type: "main" },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Proyek tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get existing paid termins
    const paidTermins = project.termins.filter(t => t.status === "paid");
    const unpaidTermins = project.termins.filter(t => t.status !== "paid");

    // Delete unpaid termins (they will be regenerated)
    if (unpaidTermins.length > 0) {
      await db.terminClient.deleteMany({
        where: {
          projectId,
          status: { not: "paid" },
          type: "main",
        },
      });
    }

    // Get milestones that already have paid termins
    const paidTerminUrutans = new Set(
      paidTermins.map(t => {
        const match = t.judul.match(/Termin (\d+):/);
        return match ? parseInt(match[1]) : 0;
      })
    );

    // Create termins for milestones that don't have paid termins
    const milestonesNeedingTermins = project.milestones.filter(
      (_, index) => !paidTerminUrutans.has(index + 1)
    );

    const newTermins: TerminClient[] = [];
    for (const milestone of milestonesNeedingTermins) {
      const terminAmounts = calculateTerminAmount(milestone.price);

      const termin = await db.terminClient.create({
        data: {
          projectId,
          judul: `Termin ${milestone.urutan}: ${milestone.judul}`,
          baseAmount: terminAmounts.baseAmount,
          type: "main",
          feeClientAmount: terminAmounts.clientFeeAmount,
          totalWithFee: terminAmounts.totalWithFee,
          status: "unpaid",
        },
      });

      newTermins.push(termin);
    }

    return NextResponse.json({
      success: true,
      message: "Termin berhasil diperbarui",
      createdCount: newTermins.length,
    });
  } catch (error) {
    console.error("Error regenerating termins:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// PATCH - Update termin configuration (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session || !isAdmin(session.email)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projectId, termins: terminConfigs } = body;

    if (!projectId || !Array.isArray(terminConfigs)) {
      return NextResponse.json(
        { success: false, message: "Project ID dan konfigurasi termin diperlukan" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, message: "Proyek tidak ditemukan" },
        { status: 404 }
      );
    }

    // Get existing termins that are not paid
    const existingTermins = await db.terminClient.findMany({
      where: {
        projectId,
        status: "unpaid",
        type: "main",
      },
    });

    // Delete existing unpaid termins
    if (existingTermins.length > 0) {
      await db.terminClient.deleteMany({
        where: {
          projectId,
          status: "unpaid",
          type: "main",
        },
      });
    }

    // Create new termins based on configuration
    const newTermins: TerminClient[] = [];
    for (const config of terminConfigs) {
      const { judul, baseAmount } = config;
      
      if (!judul || !baseAmount || baseAmount <= 0) {
        continue;
      }

      const feeClientAmount = baseAmount * (CLIENT_FEE_PERCENT / 100);
      const totalWithFee = baseAmount + feeClientAmount;

      const termin = await db.terminClient.create({
        data: {
          projectId,
          judul,
          baseAmount,
          type: "main",
          feeClientAmount,
          totalWithFee,
          status: "unpaid",
        },
      });

      newTermins.push(termin);
    }

    return NextResponse.json({
      success: true,
      message: "Konfigurasi termin berhasil diperbarui",
      termins: newTermins,
    });
  } catch (error) {
    console.error("Error updating termin configuration:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
