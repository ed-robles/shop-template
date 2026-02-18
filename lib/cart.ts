import { type Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  CartAdjustment,
  CartSnapshot,
  CartSnapshotItem,
  GuestCartItemInput,
} from "@/lib/cart-types";

const CART_PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  imageUrl: true,
  priceInCents: true,
  stockQuantity: true,
  status: true,
} as const;

type TransactionClient = Prisma.TransactionClient;

type CartWithItems = Prisma.CartGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: typeof CART_PRODUCT_SELECT;
        };
      };
      orderBy: {
        createdAt: "asc";
      };
    };
  };
}>;

export class CartItemNotFoundError extends Error {
  constructor() {
    super("Cart item not found.");
    this.name = "CartItemNotFoundError";
  }
}

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function buildClampAdjustment({
  productId,
  productName,
  requestedQuantity,
  adjustedQuantity,
}: {
  productId: string;
  productName: string;
  requestedQuantity: number;
  adjustedQuantity: number;
}): CartAdjustment {
  return {
    code: "CLAMPED_TO_STOCK",
    productId,
    productName,
    requestedQuantity,
    adjustedQuantity,
    message: `${productName} was adjusted to ${adjustedQuantity} because of available stock.`,
  };
}

function buildUnavailableAdjustment({
  productId,
  productName,
  requestedQuantity,
}: {
  productId: string;
  productName: string;
  requestedQuantity: number;
}): CartAdjustment {
  return {
    code: "REMOVED_UNAVAILABLE",
    productId,
    productName,
    requestedQuantity,
    adjustedQuantity: 0,
    message: `${productName} is no longer available and was removed from your cart.`,
  };
}

async function getOrCreateUserCartForTx(tx: TransactionClient, userId: string) {
  const existingCart = await tx.cart.findUnique({
    where: { userId },
    select: { id: true, userId: true },
  });

  if (existingCart) {
    return existingCart;
  }

  return tx.cart.create({
    data: {
      userId,
    },
    select: { id: true, userId: true },
  });
}

function createSnapshot(
  items: CartSnapshotItem[],
  adjustments: CartAdjustment[],
): CartSnapshot {
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const subtotalInCents = items.reduce(
    (subtotal, item) => subtotal + item.lineTotalInCents,
    0,
  );

  return {
    items,
    itemCount,
    subtotalInCents,
    adjustments,
  };
}

async function getNormalizedCartSnapshotForTx(
  tx: TransactionClient,
  cartId: string,
  initialAdjustments: CartAdjustment[] = [],
): Promise<CartSnapshot> {
  const cart = (await tx.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          product: {
            select: CART_PRODUCT_SELECT,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  })) as CartWithItems | null;

  if (!cart) {
    return createSnapshot([], initialAdjustments);
  }

  const adjustments = [...initialAdjustments];
  const normalizedItems: CartSnapshotItem[] = [];

  for (const item of cart.items) {
    const requestedQuantity = normalizeQuantity(item.quantity);
    const isPublished = item.product.status === ProductStatus.PUBLISHED;
    const stockQuantity = normalizeQuantity(item.product.stockQuantity);

    if (!isPublished || stockQuantity <= 0) {
      await tx.cartItem.delete({
        where: { id: item.id },
      });

      adjustments.push(
        buildUnavailableAdjustment({
          productId: item.productId,
          productName: item.product.name,
          requestedQuantity,
        }),
      );
      continue;
    }

    const adjustedQuantity = Math.min(requestedQuantity, stockQuantity);

    if (adjustedQuantity <= 0) {
      await tx.cartItem.delete({
        where: { id: item.id },
      });

      adjustments.push(
        buildUnavailableAdjustment({
          productId: item.productId,
          productName: item.product.name,
          requestedQuantity,
        }),
      );
      continue;
    }

    if (adjustedQuantity !== requestedQuantity) {
      await tx.cartItem.update({
        where: { id: item.id },
        data: { quantity: adjustedQuantity },
      });

      adjustments.push(
        buildClampAdjustment({
          productId: item.productId,
          productName: item.product.name,
          requestedQuantity,
          adjustedQuantity,
        }),
      );
    }

    normalizedItems.push({
      id: item.id,
      productId: item.product.id,
      slug: item.product.slug,
      name: item.product.name,
      imageUrl: item.product.imageUrl,
      priceInCents: item.product.priceInCents,
      stockQuantity,
      maxAllowedQuantity: stockQuantity,
      quantity: adjustedQuantity,
      lineTotalInCents: item.product.priceInCents * adjustedQuantity,
    });
  }

  return createSnapshot(normalizedItems, adjustments);
}

export async function getOrCreateUserCart(userId: string) {
  return prisma.$transaction(async (tx) => {
    return getOrCreateUserCartForTx(tx, userId);
  });
}

export async function getCartSnapshot(userId: string) {
  return prisma.$transaction(async (tx) => {
    const cart = await getOrCreateUserCartForTx(tx, userId);
    return getNormalizedCartSnapshotForTx(tx, cart.id);
  });
}

export async function upsertCartItemWithStock(
  userId: string,
  productId: string,
  quantity: number,
) {
  const requestedAddition = normalizeQuantity(quantity);

  return prisma.$transaction(async (tx) => {
    const cart = await getOrCreateUserCartForTx(tx, userId);
    const adjustments: CartAdjustment[] = [];

    if (requestedAddition <= 0) {
      return getNormalizedCartSnapshotForTx(tx, cart.id, adjustments);
    }

    const product = await tx.product.findUnique({
      where: { id: productId },
      select: CART_PRODUCT_SELECT,
    });

    if (!product || product.status !== ProductStatus.PUBLISHED) {
      adjustments.push(
        buildUnavailableAdjustment({
          productId,
          productName: product?.name || "Item",
          requestedQuantity: requestedAddition,
        }),
      );

      return getNormalizedCartSnapshotForTx(tx, cart.id, adjustments);
    }

    const stockQuantity = normalizeQuantity(product.stockQuantity);

    if (stockQuantity <= 0) {
      adjustments.push(
        buildUnavailableAdjustment({
          productId,
          productName: product.name,
          requestedQuantity: requestedAddition,
        }),
      );

      return getNormalizedCartSnapshotForTx(tx, cart.id, adjustments);
    }

    const existing = await tx.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
      select: {
        id: true,
        quantity: true,
      },
    });

    const existingQuantity = normalizeQuantity(existing?.quantity ?? 0);
    const requestedQuantity = existingQuantity + requestedAddition;
    const adjustedQuantity = Math.min(requestedQuantity, stockQuantity);

    if (existing) {
      await tx.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: adjustedQuantity,
        },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity: adjustedQuantity,
        },
      });
    }

    if (adjustedQuantity < requestedQuantity) {
      adjustments.push(
        buildClampAdjustment({
          productId,
          productName: product.name,
          requestedQuantity,
          adjustedQuantity,
        }),
      );
    }

    return getNormalizedCartSnapshotForTx(tx, cart.id, adjustments);
  });
}

export async function setCartItemQuantityWithStock(
  userId: string,
  itemId: string,
  quantity: number,
) {
  const requestedQuantity = normalizeQuantity(quantity);

  return prisma.$transaction(async (tx) => {
    const cart = await getOrCreateUserCartForTx(tx, userId);
    const cartItem = await tx.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      include: {
        product: {
          select: CART_PRODUCT_SELECT,
        },
      },
    });

    if (!cartItem) {
      throw new CartItemNotFoundError();
    }

    if (requestedQuantity <= 0) {
      await tx.cartItem.delete({
        where: {
          id: cartItem.id,
        },
      });

      return getNormalizedCartSnapshotForTx(tx, cart.id);
    }

    const adjustments: CartAdjustment[] = [];
    const isPublished = cartItem.product.status === ProductStatus.PUBLISHED;
    const stockQuantity = normalizeQuantity(cartItem.product.stockQuantity);

    if (!isPublished || stockQuantity <= 0) {
      await tx.cartItem.delete({
        where: { id: cartItem.id },
      });

      adjustments.push(
        buildUnavailableAdjustment({
          productId: cartItem.productId,
          productName: cartItem.product.name,
          requestedQuantity,
        }),
      );

      return getNormalizedCartSnapshotForTx(tx, cart.id, adjustments);
    }

    const adjustedQuantity = Math.min(requestedQuantity, stockQuantity);

    await tx.cartItem.update({
      where: {
        id: cartItem.id,
      },
      data: {
        quantity: adjustedQuantity,
      },
    });

    if (adjustedQuantity < requestedQuantity) {
      adjustments.push(
        buildClampAdjustment({
          productId: cartItem.productId,
          productName: cartItem.product.name,
          requestedQuantity,
          adjustedQuantity,
        }),
      );
    }

    return getNormalizedCartSnapshotForTx(tx, cart.id, adjustments);
  });
}

export async function removeCartItem(userId: string, itemId: string) {
  return prisma.$transaction(async (tx) => {
    const cart = await getOrCreateUserCartForTx(tx, userId);
    const cartItem = await tx.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      select: {
        id: true,
      },
    });

    if (!cartItem) {
      throw new CartItemNotFoundError();
    }

    await tx.cartItem.delete({
      where: {
        id: cartItem.id,
      },
    });

    return getNormalizedCartSnapshotForTx(tx, cart.id);
  });
}

export async function mergeGuestCartWithUserCart(
  userId: string,
  items: GuestCartItemInput[],
) {
  const mergedGuestQuantities = new Map<string, number>();

  for (const item of items) {
    const productId = item.productId.trim();
    if (!productId) {
      continue;
    }

    const nextQuantity = normalizeQuantity(item.quantity);
    if (nextQuantity <= 0) {
      continue;
    }

    mergedGuestQuantities.set(
      productId,
      (mergedGuestQuantities.get(productId) || 0) + nextQuantity,
    );
  }

  return prisma.$transaction(async (tx) => {
    const cart = await getOrCreateUserCartForTx(tx, userId);
    const adjustments: CartAdjustment[] = [];
    const productIds = Array.from(mergedGuestQuantities.keys());

    if (productIds.length === 0) {
      return getNormalizedCartSnapshotForTx(tx, cart.id, adjustments);
    }

    const products = await tx.product.findMany({
      where: {
        id: { in: productIds },
        status: ProductStatus.PUBLISHED,
      },
      select: CART_PRODUCT_SELECT,
    });

    const productById = new Map(products.map((product) => [product.id, product]));
    const existingItems = await tx.cartItem.findMany({
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

    const existingItemByProductId = new Map(
      existingItems.map((item) => [item.productId, item]),
    );

    for (const productId of productIds) {
      const guestQuantity = normalizeQuantity(mergedGuestQuantities.get(productId) || 0);
      if (guestQuantity <= 0) {
        continue;
      }

      const product = productById.get(productId);
      if (!product) {
        adjustments.push(
          buildUnavailableAdjustment({
            productId,
            productName: "Item",
            requestedQuantity: guestQuantity,
          }),
        );
        continue;
      }

      const stockQuantity = normalizeQuantity(product.stockQuantity);
      if (stockQuantity <= 0) {
        adjustments.push(
          buildUnavailableAdjustment({
            productId,
            productName: product.name,
            requestedQuantity: guestQuantity,
          }),
        );
        continue;
      }

      const existingItem = existingItemByProductId.get(productId);
      const existingQuantity = normalizeQuantity(existingItem?.quantity || 0);
      const requestedQuantity = existingQuantity + guestQuantity;
      const adjustedQuantity = Math.min(requestedQuantity, stockQuantity);

      if (existingItem) {
        await tx.cartItem.update({
          where: {
            id: existingItem.id,
          },
          data: {
            quantity: adjustedQuantity,
          },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity: adjustedQuantity,
          },
        });
      }

      if (adjustedQuantity < requestedQuantity) {
        adjustments.push(
          buildClampAdjustment({
            productId,
            productName: product.name,
            requestedQuantity,
            adjustedQuantity,
          }),
        );
      }
    }

    return getNormalizedCartSnapshotForTx(tx, cart.id, adjustments);
  });
}
