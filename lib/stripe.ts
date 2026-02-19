import Stripe from "stripe";

const globalForStripe = globalThis as unknown as {
  stripe?: Stripe;
};

export function getStripeClient() {
  if (globalForStripe.stripe) {
    return globalForStripe.stripe;
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is missing.");
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2026-01-28.clover",
  });

  if (process.env.NODE_ENV !== "production") {
    globalForStripe.stripe = stripe;
  }

  return stripe;
}

export function getAllowedShippingCountries() {
  const rawValue = process.env.STRIPE_SHIPPING_COUNTRIES;
  const parsedValues = (rawValue || "US")
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => value.length === 2);

  const uniqueValues = Array.from(new Set(parsedValues));

  return (uniqueValues.length > 0 ? uniqueValues : ["US"]) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
}
