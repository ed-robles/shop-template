import { Order, OrderItem } from "@prisma/client";
import Stripe from "stripe";
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

function formatAmount(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}

function getAdminEmails() {
  return Array.from(
    new Set(
      (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
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

export async function sendAdminOrderNotificationByResend(data: {
  order: Order & { items: OrderItem[] };
  session: Stripe.Checkout.Session;
  stripeLineItems: Stripe.LineItem[];
}) {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) {
    return;
  }

  const client = getResendClient();

  const billingName = data.session.customer_details?.name || "Unknown";
  const billingEmail =
    data.session.customer_details?.email || data.session.customer_email || data.order.customerEmail || "Unknown";
  const shippingDetails = data.session.collected_information?.shipping_details;
  const shippingName = shippingDetails?.name || "Not provided";
  const shippingAddress = shippingDetails?.address
    ? [
        shippingDetails.address.line1,
        shippingDetails.address.line2,
        shippingDetails.address.city,
        shippingDetails.address.state,
        shippingDetails.address.postal_code,
        shippingDetails.address.country,
      ]
        .filter(Boolean)
        .join(", ")
    : "Not provided";

  const orderItemsLines = data.order.items
    .map(
      (item, index) =>
        `${index + 1}. ${item.productName} | qty ${item.quantity} | ${formatAmount(item.unitAmountInCents, data.order.currency)} each | line total ${formatAmount(item.lineTotalInCents, data.order.currency)}`,
    )
    .join("\n");

  const stripeItemsLines = data.stripeLineItems
    .map((item, index) => {
      const quantity = item.quantity || 0;
      const unitAmountInCents = item.price?.unit_amount || 0;
      const subtotalInCents = item.amount_subtotal || unitAmountInCents * quantity;
      const currency = (item.currency || data.order.currency).toLowerCase();
      return `${index + 1}. ${item.description || "Item"} | qty ${quantity} | ${formatAmount(unitAmountInCents, currency)} each | subtotal ${formatAmount(subtotalInCents, currency)} | stripe line item id ${item.id}`;
    })
    .join("\n");

  const emailText = [
    `A purchase was marked paid in ${appName}.`,
    "",
    "Order Summary",
    `- Internal order id: ${data.order.id}`,
    `- Stripe checkout session id: ${data.order.stripeCheckoutSessionId}`,
    `- Stripe payment intent id: ${data.order.stripePaymentIntentId || "N/A"}`,
    `- Stripe customer id: ${typeof data.session.customer === "string" ? data.session.customer : data.session.customer?.id || "N/A"}`,
    `- Order status: ${data.order.status}`,
    `- Currency: ${data.order.currency.toUpperCase()}`,
    `- Subtotal: ${formatAmount(data.order.amountSubtotalInCents, data.order.currency)}`,
    `- Total: ${formatAmount(data.order.amountTotalInCents, data.order.currency)}`,
    `- Paid at: ${data.order.paidAt?.toISOString() || "N/A"}`,
    `- Created at: ${data.order.createdAt.toISOString()}`,
    "",
    "Customer",
    `- Name: ${billingName}`,
    `- Email: ${billingEmail}`,
    `- Phone: ${data.session.customer_details?.phone || "Not provided"}`,
    "",
    "Shipping",
    `- Name: ${shippingName}`,
    `- Address: ${shippingAddress}`,
    "",
    "Order Items (database snapshot)",
    orderItemsLines || "No order items found.",
    "",
    "Stripe Line Items",
    stripeItemsLines || "No Stripe line items found.",
  ].join("\n");

  await client.emails.send({
    from: fromEmail,
    to: adminEmails,
    subject: `[${appName}] Paid order ${data.order.id}`,
    text: emailText,
  });
}
