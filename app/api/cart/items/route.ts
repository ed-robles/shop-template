import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/cart-auth";
import { upsertCartItemWithStock } from "@/lib/cart";

type AddCartItemBody = {
  productId?: unknown;
  quantity?: unknown;
};

function parsePositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as AddCartItemBody;
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const quantity = parsePositiveInteger(body.quantity);

  if (!productId) {
    return NextResponse.json(
      { error: "productId is required." },
      { status: 400 },
    );
  }

  if (quantity === null) {
    return NextResponse.json(
      { error: "quantity must be a positive integer." },
      { status: 400 },
    );
  }

  const cart = await upsertCartItemWithStock(userId, productId, quantity);
  return NextResponse.json({ cart }, { status: 200 });
}
