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
