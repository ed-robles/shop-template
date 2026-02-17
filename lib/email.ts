import { Resend } from "resend";

const appName = process.env.APP_NAME || "Shop Template";
const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

let resendClient: Resend | null = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

export async function sendVerificationEmailByResend(data: {
  to: string;
  name?: string | null;
  verificationUrl: string;
}) {
  const client = getResendClient();

  await client.emails.send({
    from: fromEmail,
    to: data.to,
    subject: `Verify your email for ${appName}`,
    text: `Hi ${data.name || "there"}, verify your email: ${data.verificationUrl}`,
    html: `<p>Hi ${data.name || "there"},</p><p>Please verify your email to continue.</p><p><a href="${data.verificationUrl}">Verify email</a></p>`,
  });
}

export async function sendPasswordResetEmailByResend(data: {
  to: string;
  name?: string | null;
  resetUrl: string;
}) {
  const client = getResendClient();

  await client.emails.send({
    from: fromEmail,
    to: data.to,
    subject: `Reset your password for ${appName}`,
    text: `Hi ${data.name || "there"}, reset your password: ${data.resetUrl}`,
    html: `<p>Hi ${data.name || "there"},</p><p>You requested a password reset.</p><p><a href="${data.resetUrl}">Reset password</a></p>`,
  });
}
