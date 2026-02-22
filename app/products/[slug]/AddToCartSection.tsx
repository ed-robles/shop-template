"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-client";

type AddToCartSectionProps = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string;
  priceInCents: number;
  stockQuantity: number;
};

function normalizeQuantity(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

export default function AddToCartSection({
  productId,
  slug,
  name,
  imageUrl,
  priceInCents,
  stockQuantity,
}: AddToCartSectionProps) {
  const { add, openCart, isMutating } = useCart();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const normalizedStock = normalizeQuantity(stockQuantity);
  const isOutOfStock = normalizedStock <= 0;

  const submit = async () => {
    if (isOutOfStock) {
      return;
    }

    await add({
      productId,
      slug,
      name,
      imageUrl,
      priceInCents,
      stockQuantity: normalizedStock,
      quantity: 1,
    });

    setStatusMessage("Added to cart.");
    openCart();
  };

  return (
    <section className="mt-6 rounded-xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {isOutOfStock ? "Out of stock" : `In stock: ${normalizedStock}`}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            void submit();
          }}
          disabled={isOutOfStock || isMutating}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isMutating ? "Adding..." : "Add to cart"}
        </button>
      </div>

      {statusMessage ? (
        <p className="mt-3 text-sm text-slate-700">{statusMessage}</p>
      ) : null}
    </section>
  );
}
