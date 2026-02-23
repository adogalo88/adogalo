import nodemailer from "nodemailer";

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== "production" || !process.env.SMTP_PASS || process.env.SMTP_PASS === "your-app-password-here";

// Create transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// Email template for OTP
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

// Send OTP email
export async function sendOtpEmail(
  email: string,
  otp: string
): Promise<{ success: boolean; message: string; otp?: string }> {
  try {
    // In development mode, just log the OTP and return success
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
        otp: otp, // Return OTP in development mode
      };
    }

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Adogalo" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Kode OTP Masuk - Adogalo`,
      html: getOtpEmailTemplate(otp),
    });

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

// Send notification email (for future use)
export async function sendNotificationEmail(
  email: string,
  subject: string,
  html: string
): Promise<{ success: boolean; message: string }> {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Adogalo" <${process.env.SMTP_USER}>`,
      to: email,
      subject,
      html,
    });

    return {
      success: true,
      message: "Email berhasil dikirim",
    };
  } catch (error) {
    console.error("Error sending notification email:", error);
    return {
      success: false,
      message: "Gagal mengirim email",
    };
  }
}
