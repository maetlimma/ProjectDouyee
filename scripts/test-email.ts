import nodemailer from 'nodemailer';
import { sendOtpEmail } from '../src/services/mailer';

const targetEmail = process.argv.slice(2).find((arg) => !arg.startsWith('--')) || process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@douyee.com';
const useEthereal = process.argv.includes('--ethereal');

async function main() {
  console.log('----------------------------------------------------');
  console.log(' Dou Yee - OTP Email Sending Test Utility');
  console.log('----------------------------------------------------');

  if (useEthereal) {
    console.log('[1/2] Creating temporary Ethereal test inbox...');
    const testAccount = await nodemailer.createTestAccount();
    console.log(`      Ethereal User: ${testAccount.user}`);

    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    console.log(`[2/2] Sending test OTP (${code}) to: ${targetEmail}...`);

    const info = await transporter.sendMail({
      from: '"Dou Yee Admin" <noreply@douyee.com>',
      to: targetEmail,
      subject: `[Dou Yee] Your Sign-In Verification Code: ${code}`,
      html: `
        <div style="font-family: sans-serif; padding: 24px; background: #f8fafc;">
          <h2>Dou Yee Admin Authentication</h2>
          <p>Your one-time test verification code is: <strong style="font-size: 28px; color: #0f172a;">${code}</strong></p>
          <p>This email was delivered via Ethereal test mailer.</p>
        </div>
      `
    });

    console.log('\nSUCCESS! Email delivered to Ethereal sandbox.');
    console.log(`View the sent email here: ${nodemailer.getTestMessageUrl(info)}`);
    console.log('----------------------------------------------------');
    return;
  }

  // Real SMTP test
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.log('WARNING: SMTP credentials are not yet set in .env!');
    console.log('');
    console.log('To send real emails, please create a .env file with:');
    console.log('  SMTP_HOST=smtp.gmail.com');
    console.log('  SMTP_PORT=587');
    console.log('  SMTP_USER=your-email@gmail.com');
    console.log('  SMTP_PASS=your-google-app-password');
    console.log('  SMTP_FROM="Dou Yee Admin" <your-email@gmail.com>');
    console.log('');
    console.log('Alternatively, you can test with a fake online inbox right now by running:');
    console.log('  bun scripts/test-email.ts --ethereal');
    console.log('----------------------------------------------------');
    return;
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  console.log(`Target Recipient : ${targetEmail}`);
  console.log(`SMTP Host        : ${host}:${process.env.SMTP_PORT || 587}`);
  console.log(`SMTP Sender      : ${user}`);
  console.log(`Test OTP Code    : ${code}`);
  console.log('Sending...');

  try {
    const res = await sendOtpEmail({ to: targetEmail, code });
    console.log('\nRESULT:', res.message);
    console.log('Please check your email inbox (and Spam/Junk folder if not in Inbox).');
  } catch (err: any) {
    console.error('\nFAILED to send email:');
    console.error(err.message || err);
  }
  console.log('----------------------------------------------------');
}

void main();
