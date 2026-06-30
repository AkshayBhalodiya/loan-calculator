import nodemailer from "nodemailer";

export async function sendResetEmail(to: string, token: string, expiresAt: Date) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Email provider not configured");

  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${encodeURIComponent(
    token
  )}`;

  const expiresText = expiresAt.toLocaleString();

  const html = `
    <h2>Password reset request</h2>
    <p>A password reset was requested for your account. Click the link below to reset your password.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link expires on <strong>${expiresText}</strong>.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `LoanWise: Password reset`,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to send email: ${text}`);
  }

  return true;
}

function buildNewDeviceTemplate({ device, location, ip, time }: { device: string; location?: string; ip: string; time: Date }) {
  return {
    subject: "LoanWise: New device sign-in detected",
    text: `We detected a sign-in from a new device on ${time.toLocaleString()}.

Device: ${device}
IP: ${ip}
Location: ${location ?? "Unknown"}

If this was you, no further action is needed. If you did not sign in, please secure your account immediately.
`,
    html: `
      <h2>New sign-in from a new device</h2>
      <p>We detected a login from a new device for your LoanWise account.</p>
      <ul>
        <li><strong>When:</strong> ${time.toLocaleString()}</li>
        <li><strong>Device:</strong> ${device}</li>
        <li><strong>IP address:</strong> ${ip}</li>
        <li><strong>Location:</strong> ${location ?? "Unknown"}</li>
      </ul>
      <p>If this was you, no action is needed. If you don't recognize this login, please change your password immediately.</p>
    `,
  };
}

export async function sendNewDeviceLoginAlert(
  to: string,
  device: string,
  ip: string,
  time: Date,
  location?: string
) {
  const from = process.env.NOTIFICATION_FROM_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is required for Nodemailer transactional emails.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  const template = buildNewDeviceTemplate({ device, location, ip, time });

  const result = await transporter.sendMail({
    from,
    to,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });

  return { accepted: result.accepted, rejected: result.rejected, messageId: result.messageId };
}
