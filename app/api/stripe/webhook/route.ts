import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  constructVerifiedEvent,
  finalizePaidOrder,
  listCheckoutSessionLineItems,
  markAsyncPaymentFailed,
  upsertOrderFromSession,
} from "@/lib/stripe-webhooks";

export const runtime = "nodejs";

function isUniqueConstraintError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  return error.code === "P2002";
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown webhook processing error.";
}

function isCheckoutSession(object: Stripe.Event.Data.Object): object is Stripe.Checkout.Session {
  return (
    typeof object === "object" &&
    object !== null &&
    "object" in object &&
    (object as { object?: string }).object === "checkout.session"
  );
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")?.trim();
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = constructVerifiedEvent(payload, signature);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const existingWebhookEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
    select: {
      processedAt: true,
    },
  });

  if (existingWebhookEvent?.processedAt) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  if (!existingWebhookEvent) {
    try {
      await prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const duplicateWebhookEvent = await prisma.stripeWebhookEvent.findUnique({
        where: { stripeEventId: event.id },
        select: { processedAt: true },
      });

      if (duplicateWebhookEvent?.processedAt) {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const sessionObject = event.data.object;
        if (!isCheckoutSession(sessionObject)) {
          break;
        }

        const lineItems = await listCheckoutSessionLineItems(sessionObject.id);

        if (sessionObject.payment_status === "paid") {
          await finalizePaidOrder(sessionObject, lineItems);
        } else {
          await upsertOrderFromSession(sessionObject, lineItems);
        }

        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const sessionObject = event.data.object;
        if (!isCheckoutSession(sessionObject)) {
          break;
        }

        const lineItems = await listCheckoutSessionLineItems(sessionObject.id);
        await finalizePaidOrder(sessionObject, lineItems);
        break;
      }
      case "checkout.session.async_payment_failed": {
        const sessionObject = event.data.object;
        if (!isCheckoutSession(sessionObject)) {
          break;
        }

        await markAsyncPaymentFailed(sessionObject);
        break;
      }
      default:
        break;
    }

    await prisma.stripeWebhookEvent.update({
      where: { stripeEventId: event.id },
      data: {
        eventType: event.type,
        processedAt: new Date(),
        processingError: null,
      },
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    await prisma.stripeWebhookEvent
      .update({
        where: { stripeEventId: event.id },
        data: {
          eventType: event.type,
          processingError: toErrorMessage(error),
        },
      })
      .catch(() => undefined);

    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
