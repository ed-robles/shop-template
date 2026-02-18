import { NextResponse } from "next/server";
import {
  CartItemNotFoundError,
  removeCartItem,
  setCartItemQuantityWithStock,
} from "@/lib/cart";
import { getAuthenticatedUserId } from "@/lib/cart-auth";

type UpdateCartItemBody = {
  quantity?: unknown;
};

function parseNonNegativeInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { itemId } = await params;
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) {
    return NextResponse.json({ error: "Invalid itemId." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as UpdateCartItemBody;
  const quantity = parseNonNegativeInteger(body.quantity);

  if (quantity === null) {
    return NextResponse.json(
      { error: "quantity must be a non-negative integer." },
      { status: 400 },
    );
  }

  try {
    const cart = await setCartItemQuantityWithStock(userId, normalizedItemId, quantity);
    return NextResponse.json({ cart }, { status: 200 });
  } catch (error) {
    if (error instanceof CartItemNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { itemId } = await params;
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) {
    return NextResponse.json({ error: "Invalid itemId." }, { status: 400 });
  }

  try {
    const cart = await removeCartItem(userId, normalizedItemId);
    return NextResponse.json({ cart }, { status: 200 });
  } catch (error) {
    if (error instanceof CartItemNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    throw error;
  }
}
