import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/cart-auth";
import { getCartSnapshot } from "@/lib/cart";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const cart = await getCartSnapshot(userId);
  return NextResponse.json({ cart }, { status: 200 });
}
