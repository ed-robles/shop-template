import { OrderStatus } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

type LineItemSnapshot = {
  productId: string | null;
  productName: string;
  quantity: number;
  unitAmountInCents: number;
  lineTotalInCents: number;
};

class StockFinalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockFinalizationError";
  }
}

function normalizePositiveInteger(value: number | null | undefined, fallback = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.floor(value);
  if (normalized <= 0) {
    return fallback;
  }

  return normalized;
}

function resolveProductId(lineItem: Stripe.LineItem) {
  const priceMetadataProductId = lineItem.price?.metadata?.productId?.trim();
  if (priceMetadataProductId) {
    return priceMetadataProductId;
  }

  const stripeProduct = lineItem.price?.product;
  if (!stripeProduct || typeof stripeProduct === "string") {
    return null;
  }

  if ("deleted" in stripeProduct && stripeProduct.deleted) {
    return null;
  }

  const productMetadataId = stripeProduct.metadata?.productId?.trim();
  return productMetadataId || null;
}

function normalizeLineItems(lineItems: Stripe.LineItem[]): LineItemSnapshot[] {
  return lineItems.map((lineItem) => {
    const quantity = normalizePositiveInteger(lineItem.quantity, 1);
    const unitAmountFromPrice = lineItem.price?.unit_amount;
    const unitAmountFromSubtotal =
      typeof lineItem.amount_subtotal === "number"
        ? Math.round(lineItem.amount_subtotal / quantity)
        : 0;
    const unitAmountInCents =
      typeof unitAmountFromPrice === "number" ? unitAmountFromPrice : unitAmountFromSubtotal;
    const lineTotalInCents =
      typeof lineItem.amount_subtotal === "number"
        ? lineItem.amount_subtotal
        : unitAmountInCents * quantity;

    return {
      productId: resolveProductId(lineItem),
      productName: lineItem.description?.trim() || "Item",
      quantity,
      unitAmountInCents,
      lineTotalInCents,
    };
  });
}

function resolvePaymentIntentId(session: Stripe.Checkout.Session) {
  const paymentIntent = session.payment_intent;
  if (!paymentIntent) {
    return null;
  }

  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
}

function resolveCustomerEmail(session: Stripe.Checkout.Session) {
  const customerEmail = session.customer_details?.email?.trim();
  if (customerEmail) {
    return customerEmail;
  }

  return session.customer_email?.trim() || null;
}

async function resolveUserId(session: Stripe.Checkout.Session) {
  const metadataUserId = session.metadata?.userId?.trim();
  if (metadataUserId) {
    const userById = await prisma.user.findUnique({
      where: { id: metadataUserId },
      select: { id: true },
    });

    if (userById) {
      return userById.id;
    }
  }

  const customerEmail = resolveCustomerEmail(session);
  if (!customerEmail) {
    return null;
  }

  const userByEmail = await prisma.user.findUnique({
    where: { email: customerEmail },
    select: { id: true },
  });

  return userByEmail?.id || null;
}

function aggregateQuantitiesByProduct(lineItems: LineItemSnapshot[]) {
  const quantitiesByProductId = new Map<string, number>();

  for (const lineItem of lineItems) {
    if (!lineItem.productId) {
      throw new StockFinalizationError("A purchased line item is missing productId metadata.");
    }

    const currentQuantity = quantitiesByProductId.get(lineItem.productId) || 0;
    quantitiesByProductId.set(lineItem.productId, currentQuantity + lineItem.quantity);
  }

  if (quantitiesByProductId.size === 0) {
    throw new StockFinalizationError("No purchasable line items were found for this checkout session.");
  }

  return quantitiesByProductId;
}

async function markOrderAsStockFailed(orderId: string, session: Stripe.Checkout.Session) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.STOCK_FAILED,
      paidAt: null,
      stripePaymentIntentId: resolvePaymentIntentId(session) || undefined,
      customerEmail: resolveCustomerEmail(session) || undefined,
    },
  });
}

export function constructVerifiedEvent(payload: string, signature: string) {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function listCheckoutSessionLineItems(sessionId: string) {
  const stripe = getStripeClient();
  const lineItems: Stripe.LineItem[] = [];
  let hasMore = true;
  let startingAfter: string | undefined;

  while (hasMore) {
    const response = await stripe.checkout.sessions.listLineItems(sessionId, {
      limit: 100,
      starting_after: startingAfter,
      expand: ["data.price.product"],
    });

    lineItems.push(...response.data);
    if (response.data.length === 0) {
      break;
    }

    hasMore = response.has_more;
    startingAfter = response.data.length > 0 ? response.data[response.data.length - 1].id : undefined;
  }

  return lineItems;
}

export async function upsertOrderFromSession(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[],
) {
  const normalizedLineItems = normalizeLineItems(lineItems);
  const resolvedUserId = await resolveUserId(session);
  const resolvedCustomerEmail = resolveCustomerEmail(session);
  const resolvedPaymentIntentId = resolvePaymentIntentId(session);
  const amountSubtotalInCents =
    typeof session.amount_subtotal === "number" ? session.amount_subtotal : 0;
  const amountTotalInCents = typeof session.amount_total === "number" ? session.amount_total : 0;
  const currency = (session.currency || "usd").toLowerCase();

  return prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findUnique({
      where: { stripeCheckoutSessionId: session.id },
      select: {
        id: true,
        status: true,
        userId: true,
        customerEmail: true,
        stripePaymentIntentId: true,
      },
    });

    const nextStatus =
      existingOrder &&
      (existingOrder.status === OrderStatus.PAID ||
        existingOrder.status === OrderStatus.PAYMENT_FAILED ||
        existingOrder.status === OrderStatus.STOCK_FAILED)
        ? existingOrder.status
        : OrderStatus.PAYMENT_PENDING;

    const order = existingOrder
      ? await tx.order.update({
          where: { id: existingOrder.id },
          data: {
            userId: resolvedUserId || existingOrder.userId || null,
            customerEmail: resolvedCustomerEmail || existingOrder.customerEmail || null,
            stripePaymentIntentId:
              resolvedPaymentIntentId || existingOrder.stripePaymentIntentId || null,
            currency,
            amountSubtotalInCents,
            amountTotalInCents,
            status: nextStatus,
          },
        })
      : await tx.order.create({
          data: {
            userId: resolvedUserId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: resolvedPaymentIntentId,
            customerEmail: resolvedCustomerEmail,
            currency,
            amountSubtotalInCents,
            amountTotalInCents,
            status: OrderStatus.PAYMENT_PENDING,
          },
        });

    await tx.orderItem.deleteMany({
      where: { orderId: order.id },
    });

    if (normalizedLineItems.length > 0) {
      await tx.orderItem.createMany({
        data: normalizedLineItems.map((lineItem) => ({
          orderId: order.id,
          productId: lineItem.productId,
          productName: lineItem.productName,
          unitAmountInCents: lineItem.unitAmountInCents,
          quantity: lineItem.quantity,
          lineTotalInCents: lineItem.lineTotalInCents,
        })),
      });
    }

    return order;
  });
}

export async function finalizePaidOrder(
  session: Stripe.Checkout.Session,
  lineItems: Stripe.LineItem[],
) {
  const order = await upsertOrderFromSession(session, lineItems);

  if (order.status === OrderStatus.PAID || order.status === OrderStatus.STOCK_FAILED) {
    return order;
  }

  const normalizedLineItems = normalizeLineItems(lineItems);
  const paymentIntentId = resolvePaymentIntentId(session);
  const customerEmail = resolveCustomerEmail(session);

  try {
    return await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: order.id },
        select: {
          id: true,
          status: true,
          userId: true,
        },
      });

      if (!existingOrder) {
        throw new Error("Order not found during paid order finalization.");
      }

      if (
        existingOrder.status === OrderStatus.PAID ||
        existingOrder.status === OrderStatus.STOCK_FAILED
      ) {
        return tx.order.findUniqueOrThrow({ where: { id: existingOrder.id } });
      }

      const quantitiesByProductId = aggregateQuantitiesByProduct(normalizedLineItems);
      const productIds = Array.from(quantitiesByProductId.keys());
      const products = await tx.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
        select: {
          id: true,
          stockQuantity: true,
        },
      });

      if (products.length !== productIds.length) {
        throw new StockFinalizationError("One or more purchased products no longer exist.");
      }

      const productById = new Map(products.map((product) => [product.id, product]));
      for (const [productId, quantity] of quantitiesByProductId) {
        const product = productById.get(productId);
        if (!product || product.stockQuantity < quantity) {
          throw new StockFinalizationError("Insufficient stock for one or more purchased products.");
        }
      }

      for (const [productId, quantity] of quantitiesByProductId) {
        const updated = await tx.product.updateMany({
          where: {
            id: productId,
            stockQuantity: {
              gte: quantity,
            },
          },
          data: {
            stockQuantity: {
              decrement: quantity,
            },
          },
        });

        if (updated.count !== 1) {
          throw new StockFinalizationError(
            "Concurrent inventory update prevented checkout finalization.",
          );
        }
      }

      if (existingOrder.userId) {
        const cart = await tx.cart.findUnique({
          where: {
            userId: existingOrder.userId,
          },
          select: {
            id: true,
          },
        });

        if (cart) {
          const cartItems = await tx.cartItem.findMany({
            where: {
              cartId: cart.id,
              productId: {
                in: productIds,
              },
            },
            select: {
              id: true,
              productId: true,
              quantity: true,
            },
          });

          for (const cartItem of cartItems) {
            const purchasedQuantity = quantitiesByProductId.get(cartItem.productId) || 0;
            if (purchasedQuantity <= 0) {
              continue;
            }

            const nextQuantity =
              normalizePositiveInteger(cartItem.quantity, 0) - purchasedQuantity;

            if (nextQuantity <= 0) {
              await tx.cartItem.delete({
                where: {
                  id: cartItem.id,
                },
              });
            } else {
              await tx.cartItem.update({
                where: {
                  id: cartItem.id,
                },
                data: {
                  quantity: nextQuantity,
                },
              });
            }
          }
        }
      }

      return tx.order.update({
        where: { id: existingOrder.id },
        data: {
          status: OrderStatus.PAID,
          paidAt: new Date(),
          stripePaymentIntentId: paymentIntentId || undefined,
          customerEmail: customerEmail || undefined,
        },
      });
    });
  } catch (error) {
    if (!(error instanceof StockFinalizationError)) {
      throw error;
    }

    return markOrderAsStockFailed(order.id, session);
  }
}

export async function markAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  const lineItems = await listCheckoutSessionLineItems(session.id);
  const order = await upsertOrderFromSession(session, lineItems);

  if (order.status === OrderStatus.PAID || order.status === OrderStatus.STOCK_FAILED) {
    return order;
  }

  return prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.PAYMENT_FAILED,
      stripePaymentIntentId: resolvePaymentIntentId(session) || undefined,
      customerEmail: resolveCustomerEmail(session) || undefined,
    },
  });
}
