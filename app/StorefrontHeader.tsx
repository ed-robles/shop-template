"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart-client";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategoryValue,
} from "@/lib/product-categories";

type StorefrontHeaderProps = {
  initialSearchTerm?: string;
  activeCategory?: ProductCategoryValue | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatPrice(priceInCents: number) {
  return currencyFormatter.format(priceInCents / 100);
}

export function StorefrontHeader({
  initialSearchTerm = "",
  activeCategory = null,
}: StorefrontHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(
    initialSearchTerm.length > 0,
  );
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    cart,
    isCartOpen,
    isSignedIn,
    isLoading,
    isMutating,
    isCheckingOut,
    errorMessage,
    openCart,
    closeCart,
    clearError,
    clearAdjustments,
    setQuantity,
    remove,
    checkout,
  } = useCart();

  useEffect(() => {
    if (!isMenuOpen && !isCartOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        closeCart();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCart, isCartOpen, isMenuOpen]);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
    if (initialSearchTerm.length > 0) {
      setIsSearchOpen(true);
    }
  }, [initialSearchTerm]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams(searchParams.toString());
    const normalizedSearchTerm = searchTerm.trim();

    if (normalizedSearchTerm.length > 0) {
      params.set("q", normalizedSearchTerm);
    } else {
      params.delete("q");
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const focusSearchInput = () => {
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  };

  return (
    <>
      <header className="bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.24em]"
          >
            Shop Template
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Toggle product search"
              aria-expanded={isSearchOpen}
              aria-controls="storefront-product-search"
              onClick={() => {
                setIsSearchOpen((isOpen) => {
                  const nextIsOpen = !isOpen;
                  if (nextIsOpen) {
                    focusSearchInput();
                  }
                  return nextIsOpen;
                });
              }}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-black"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                />
              </svg>
            </button>

            <Link
              href="/account"
              aria-label="Open account page"
              className="inline-flex h-10 w-10 items-center justify-center text-black"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0"
                />
              </svg>
            </Link>

            <button
              type="button"
              aria-label="Open cart"
              aria-expanded={isCartOpen}
              aria-controls="storefront-cart-sidebar"
              onClick={() => {
                setIsMenuOpen(false);
                clearError();
                openCart();
              }}
              className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center text-black"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75M4.5 10.5h15l-1.5 9.75a2.25 2.25 0 0 1-2.227 1.905H8.227A2.25 2.25 0 0 1 6 20.25L4.5 10.5Z"
                />
              </svg>
              {cart.itemCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {cart.itemCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="storefront-sidebar"
              onClick={() => {
                closeCart();
                setIsMenuOpen(true);
              }}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-black"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-6 w-6"
              >
                <path strokeLinecap="round" d="M4.5 7.5h15" />
                <path strokeLinecap="round" d="M4.5 12h15" />
                <path strokeLinecap="round" d="M4.5 16.5h15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        className={`overflow-hidden bg-white transition-[max-height,opacity] duration-300 ${
          isSearchOpen ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-2">
          <form
            id="storefront-product-search"
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2"
          >
            <label htmlFor="storefront-search-input" className="sr-only">
              Search products by name, category, or SKU
            </label>
            <div className="flex h-9 w-full items-center gap-2">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                aria-hidden="true"
                className="h-3.5 w-3.5 text-black"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                />
              </svg>
              <input
                ref={searchInputRef}
                id="storefront-search-input"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-9 w-full bg-white text-sm text-slate-900 outline-none"
              />
            </div>
          </form>
        </div>
      </div>

      {pathname === "/" ? (
        <nav
          aria-label="Product categories"
          className="border-t-[0.5px] border-b-[0.5px] border-black bg-white"
        >
          <div className="mx-auto flex w-full max-w-6xl items-center gap-5 overflow-x-auto px-5 py-3">
            <Link
              href="/"
              className={`whitespace-nowrap text-xs font-semibold uppercase tracking-tight text-black ${
                activeCategory === null
                  ? "underline decoration-2 underline-offset-4"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              All
            </Link>
            {PRODUCT_CATEGORIES.map((category) => (
              <Link
                key={category}
                href={`/?category=${category.toLowerCase()}`}
                className={`whitespace-nowrap text-xs font-semibold uppercase tracking-tight text-black ${
                  activeCategory === category
                    ? "underline decoration-2 underline-offset-4"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                {PRODUCT_CATEGORY_LABELS[category]}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isMenuOpen}
      >
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setIsMenuOpen(false)}
          className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        />

        <aside
          id="storefront-sidebar"
          className={`absolute right-0 top-0 h-full border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 ${
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          } w-full sm:w-[22rem]`}
        >
          <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">
              Menu
            </p>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" d="m6 6 12 12" />
                <path strokeLinecap="round" d="m18 6-12 12" />
              </svg>
            </button>
          </div>

          <div className="px-4 py-4" />
        </aside>
      </div>

      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          isCartOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isCartOpen}
      >
        <button
          type="button"
          aria-label="Close cart"
          onClick={closeCart}
          className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        />

        <aside
          id="storefront-cart-sidebar"
          className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 sm:w-[26rem] ${
            isCartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-12 items-center justify-between border-b border-slate-200 px-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">
              Cart
            </p>
            <button
              type="button"
              aria-label="Close cart"
              onClick={closeCart}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" d="m6 6 12 12" />
                <path strokeLinecap="round" d="m18 6-12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {errorMessage ? (
              <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            {cart.adjustments.length > 0 ? (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold uppercase tracking-wider">Cart updates</p>
                  <button
                    type="button"
                    onClick={clearAdjustments}
                    className="text-[11px] font-medium uppercase tracking-wider text-amber-900/80 hover:text-amber-950"
                  >
                    Dismiss
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {cart.adjustments.map((adjustment, index) => (
                    <li key={`${adjustment.productId}-${index}`}>{adjustment.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {isLoading ? (
              <p className="text-sm text-slate-600">Loading cart...</p>
            ) : cart.items.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                Your cart is empty.
              </p>
            ) : (
              <ul className="space-y-3">
                {cart.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-3"
                  >
                    <div className="flex gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-20 w-16 rounded-md object-cover"
                      />

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={closeCart}
                          className="line-clamp-2 text-sm font-medium text-slate-900 hover:underline"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-sm text-slate-700">
                          {formatPrice(item.priceInCents)}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                          Max {item.maxAllowedQuantity}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void setQuantity(item.id, item.productId, item.quantity - 1)
                            }
                            disabled={isMutating}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={item.maxAllowedQuantity}
                            value={item.quantity}
                            onChange={(event) => {
                              const parsedValue = Number(event.target.value);
                              if (!Number.isFinite(parsedValue)) {
                                return;
                              }

                              void setQuantity(
                                item.id,
                                item.productId,
                                Math.floor(parsedValue),
                              );
                            }}
                            className="h-7 w-14 rounded border border-slate-300 px-1 text-center text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              void setQuantity(item.id, item.productId, item.quantity + 1)
                            }
                            disabled={isMutating || item.quantity >= item.maxAllowedQuantity}
                            className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            +
                          </button>

                          <button
                            type="button"
                            onClick={() => void remove(item.id, item.productId)}
                            disabled={isMutating}
                            className="ml-auto text-xs font-medium uppercase tracking-wider text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span>Items</span>
              <span>{cart.itemCount}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm font-semibold text-slate-900">
              <span>Subtotal</span>
              <span>{formatPrice(cart.subtotalInCents)}</span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Shipping address is required at checkout.
            </p>
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => {
                  void checkout();
                }}
                disabled={
                  isLoading ||
                  isMutating ||
                  isCheckingOut ||
                  cart.items.length === 0
                }
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCheckingOut ? "Redirecting..." : "Checkout"}
              </button>
            ) : (
              <Link
                href="/auth"
                onClick={closeCart}
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:text-slate-950"
              >
                Sign in to checkout
              </Link>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
