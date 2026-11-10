import nodemailer from 'nodemailer';

interface SendOtpOptions {
  to: string;
  code: string;
  expiresInMinutes?: number;
}

export async function sendOtpEmail({
  to,
  code,
  expiresInMinutes = 5
}: SendOtpOptions): Promise<{ sent: boolean; message: string }> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const from = process.env.SMTP_FROM || user || 'Dou Yee Admin <noreply@douyee.com>';

  console.info(`[ADMIN AUTH] OTP for ${to}: ${code}`);

  if (!host || !user || !pass) {
    console.info(
      `[MAILER] SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS). OTP ${code} was output to console.`
    );
    return {
      sent: false,
      message: 'SMTP not configured. OTP was printed to server console.'
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  const subject = `[Dou Yee] Your Sign-In Verification Code: ${code}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);">
          <!-- Header -->
          <div style="padding: 28px 32px; background: #0f172a; color: #ffffff; text-align: center;">
            <div style="margin-bottom: 14px;">
              <span style="display: inline-block; background: #ffffff; color: #0a6fc2; font-weight: 800; font-size: 15px; padding: 6px 16px; border-radius: 8px; letter-spacing: 2px;">DOU YEE ENTERPRISES</span>
            </div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Dou Yee Admin Authentication</h1>
            <p style="margin: 6px 0 0 0; color: #94a3b8; font-size: 13px;">Operator Management Cockpit</p>
          </div>

          <!-- Body -->
          <div style="padding: 32px;">
            <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #334155;">
              Hello,
            </p>
            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #475569;">
              We received a sign-in request for your account <strong>${to}</strong>. Use the 6-digit one-time code below to verify your sign-in:
            </p>

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="display: block; font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #0f172a; font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace;">${code}</span>
              <span style="display: block; margin-top: 10px; font-size: 13px; color: #64748b;">Valid for <strong>${expiresInMinutes} minutes</strong></span>
            </div>

            <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #64748b;">
              If you did not request this verification code, please ignore this email or alert your system administrator immediately. Do not share this code with anyone.
            </p>
          </div>

          <!-- Footer -->
          <div style="padding: 20px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
            Dou Yee Enterprises (S) Pte Ltd · Enterprise Operations
          </div>
        </div>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from,
    to,
    subject,
    text: `Your Dou Yee Admin sign-in code is: ${code}. It expires in ${expiresInMinutes} minutes.`,
    html
  });

  console.info(`[MAILER] OTP email successfully sent to ${to}`);
  return { sent: true, message: `OTP code sent to ${to}` };
}
