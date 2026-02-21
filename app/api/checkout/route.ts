import { NextResponse } from "next/server";
import { getCartSnapshot } from "@/lib/cart";
import { getAuthenticatedUserId } from "@/lib/cart-auth";
import { prisma } from "@/lib/prisma";
import { getAllowedShippingCountries, getStripeClient } from "@/lib/stripe";

function resolveBaseUrl(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (origin) {
    return origin;
  }

  const configuredBaseUrl =
    process.env.CHECKOUT_BASE_URL?.trim() || process.env.BETTER_AUTH_URL?.trim();
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  return "http://localhost:3000";
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in to checkout." },
      { status: 401 },
    );
  }

  const cart = await getCartSnapshot(userId);
  if (cart.items.length === 0) {
    return NextResponse.json(
      { error: "Your cart is empty." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const baseUrl = resolveBaseUrl(request);

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: cart.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.priceInCents,
          product_data: {
            name: item.name,
            metadata: {
              productId: item.productId,
            },
          },
        },
      })),
      shipping_address_collection: {
        allowed_countries: getAllowedShippingCountries(),
      },
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
      customer_email: user?.email || undefined,
      metadata: {
        userId,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Unable to create checkout URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Unable to start checkout. Check Stripe configuration." },
      { status: 500 },
    );
  }
}
