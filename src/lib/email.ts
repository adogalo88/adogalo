// src/lib/email.ts
// Tidak perlu import nodemailer lagi, kita pakai fetch bawaan

// Konfigurasi Brevo API
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// Cek mode development (jika tidak ada API Key, mode development aktif)
const isDevelopment = process.env.NODE_ENV !== "production" || !process.env.BREVO_API_KEY;

// Email template for OTP (Kode ini tetap dipertahankan)
function getOtpEmailTemplate(otp: string, appName: string = "Adogalo"): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kode OTP - ${appName}</title>
    </head>
    <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%); font-family: 'Plus Jakarta Sans', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" style="max-width: 500px; background: rgba(30, 30, 50, 0.9); border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);">
              <tr>
                <td style="padding: 40px 30px;">
                  <!-- Logo -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom: 30px;">
                        <h1 style="margin: 0; color: #FF9013; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                          🔧 ${appName}
                        </h1>
                        <p style="margin: 10px 0 0; color: #94a3b8; font-size: 14px;">
                          Sistem Manajemen Proyek Konstruksi
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Main Content -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding: 20px 0;">
                        <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 600; text-align: center;">
                          Kode Verifikasi Anda
                        </h2>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 20px 0;">
                        <div style="background: linear-gradient(135deg, rgba(255, 144, 19, 0.2) 0%, rgba(255, 144, 19, 0.1) 100%); border: 2px solid #FF9013; border-radius: 16px; padding: 25px 50px; display: inline-block;">
                          <span style="font-size: 36px; font-weight: 700; color: #FF9013; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                            ${otp}
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 0;">
                        <p style="margin: 0; color: #94a3b8; font-size: 14px; text-align: center; line-height: 1.6;">
                          Gunakan kode di atas untuk masuk ke akun Anda.<br>
                          Kode ini akan kadaluarsa dalam <strong style="color: #FF9013;">5 menit</strong>.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 0 0;">
                        <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #EF4444; border-radius: 8px; padding: 15px 20px;">
                          <p style="margin: 0; color: #fca5a5; font-size: 13px;">
                            ⚠️ <strong>Penting:</strong> Jangan bagikan kode ini kepada siapapun, termasuk pihak yang mengaku dari ${appName}.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-top: 40px; border-top: 1px solid rgba(255, 255, 255, 0.1); margin-top: 30px;">
                        <p style="margin: 0; color: #64748b; font-size: 12px; text-align: center;">
                          Email ini dikirim secara otomatis. Mohon tidak membalas email ini.
                        </p>
                        <p style="margin: 10px 0 0; color: #64748b; font-size: 12px; text-align: center;">
                          © ${new Date().getFullYear()} ${appName}. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Fungsi utama kirim OTP
export async function sendOtpEmail(
  email: string,
  otp: string
): Promise<{ success: boolean; message: string; otp?: string }> {
  try {
    // Mode Development: Jika tidak ada API Key, tampilkan di log saja
    if (isDevelopment) {
      console.log("\n" + "=".repeat(50));
      console.log("🔑 DEVELOPMENT MODE - OTP LOGIN");
      console.log("=".repeat(50));
      console.log(`📧 Email: ${email}`);
      console.log(`🔢 OTP Code: ${otp}`);
      console.log("=".repeat(50) + "\n");
      
      return {
        success: true,
        message: "OTP berhasil dikirim (Development Mode - cek console)",
        otp: otp,
      };
    }

    // PRODUCTION: Kirim via Brevo API
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SMTP_USER;

    if (!apiKey || !senderEmail) {
      throw new Error("Konfigurasi BREVO_API_KEY atau SMTP_USER belum lengkap di server.");
    }

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail },
        to: [{ email: email }],
        subject: `Kode OTP Masuk - Adogalo`,
        htmlContent: getOtpEmailTemplate(otp),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo API Error:", errorData);
      throw new Error(`Gagal mengirim email: ${errorData.message || 'Unknown error'}`);
    }

    return {
      success: true,
      message: "OTP berhasil dikirim ke email Anda",
    };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return {
      success: false,
      message: "Gagal mengirim email OTP. Silakan coba lagi.",
    };
  }
}

// Fungsi kirim notifikasi
export async function sendNotificationEmail(
  email: string,
  subject: string,
  html: string
): Promise<{ success: boolean; message: string }> {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SMTP_USER;

    if (!apiKey || !senderEmail) {
      if (isDevelopment) console.log("[Notifikasi Email]", { to: email, subject });
      return { success: true, message: isDevelopment ? "Notifikasi (dev)" : "Konfigurasi email belum lengkap" };
    }

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail },
        to: [{ email: email }],
        subject: subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || "Gagal kirim notifikasi");
    }

    return { success: true, message: "Email berhasil dikirim" };
  } catch (error) {
    console.error("Error sending notification email:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengirim email",
    };
  }
}

const notificationHtml = (title: string, body: string, projectTitle?: string) => `
<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#0f0f1a;color:#e2e8f0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:rgba(30,30,50,0.9);border-radius:16px;padding:24px;border:1px solid rgba(255,255,255,0.1);">
    <h2 style="color:#FF9013;margin:0 0 16px;">${title}</h2>
    ${projectTitle ? `<p style="color:#94a3b8;font-size:14px;margin:0 0 12px;">Proyek: ${projectTitle}</p>` : ""}
    <p style="margin:0;line-height:1.6;">${body}</p>
    <p style="margin:16px 0 0;color:#64748b;font-size:12px;">Adogalo - Sistem Manajemen Proyek Konstruksi</p>
  </div>
</body></html>`;

export async function notifyMilestoneSubmittedForCompletion(
  clientEmail: string,
  projectTitle: string,
  milestoneTitle: string
) {
  return sendNotificationEmail(
    clientEmail,
    `[Adogalo] Pekerjaan "${milestoneTitle}" menunggu persetujuan`,
    notificationHtml(
      "Pekerjaan diajukan selesai",
      `Vendor telah mengajukan penyelesaian pekerjaan: <strong>${milestoneTitle}</strong>. Silakan tinjau dan setujui di aplikasi.`,
      projectTitle
    )
  );
}

export async function notifyRetensiComplaint(vendorEmail: string, projectTitle: string) {
  return sendNotificationEmail(
    vendorEmail,
    "[Adogalo] Ada komplain pada masa retensi",
    notificationHtml(
      "Komplain masa retensi",
      "Client mengajukan komplain selama masa retensi. Silakan lakukan perbaikan dan upload bukti di aplikasi.",
      projectTitle
    )
  );
}

export async function notifyRetensiFixSubmitted(clientEmail: string, projectTitle: string) {
  return sendNotificationEmail(
    clientEmail,
    "[Adogalo] Perbaikan komplain retensi telah diupload",
    notificationHtml(
      "Perbaikan diupload",
      "Vendor telah mengupload bukti perbaikan untuk komplain retensi. Silakan tinjau dan konfirmasi di aplikasi.",
      projectTitle
    )
  );
}