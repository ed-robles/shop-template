import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/cart-auth";
import { mergeGuestCartWithUserCart } from "@/lib/cart";
import type { GuestCartItemInput } from "@/lib/cart-types";

type MergeCartBody = {
  items?: unknown;
};

function parseItems(value: unknown): GuestCartItemInput[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const candidate = item as { productId?: unknown; quantity?: unknown };
      const productId =
        typeof candidate.productId === "string" ? candidate.productId.trim() : "";
      const quantity = candidate.quantity;

      if (
        !productId ||
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return null;
      }

      return {
        productId,
        quantity,
      };
    })
    .filter((item): item is GuestCartItemInput => item !== null);
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as MergeCartBody;
  const items = parseItems(body.items);

  if (items === null) {
    return NextResponse.json(
      { error: "items must be an array." },
      { status: 400 },
    );
  }

  const cart = await mergeGuestCartWithUserCart(userId, items);
  return NextResponse.json({ cart }, { status: 200 });
}
