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
        <div className="mx-auto grid w-full max-w-none grid-cols-[1fr_auto_1fr] items-center px-2 py-3 sm:px-3">
          <div className="flex items-center justify-start gap-2">
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
          </div>

          <Link
            href="/"
            className="justify-self-center text-sm font-semibold uppercase tracking-[0.24em]"
          >
            Shop Template
          </Link>

          <div className="flex items-center justify-end gap-2">

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
          </div>
        </div>
      </header>

      <div
        className={`overflow-hidden bg-white transition-[max-height,opacity] duration-300 ${
          isSearchOpen ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto w-full max-w-none px-2 py-2 sm:px-3">
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
          <div className="mx-auto flex w-full max-w-none items-center gap-5 overflow-x-auto px-2 py-3 sm:px-3">
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
          className={`absolute left-0 top-0 h-full bg-white shadow-xl transition-transform duration-300 ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          } w-full sm:w-[22rem]`}
        >
          <div className="flex h-12 items-center justify-between px-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black">
              Menu
            </p>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setIsMenuOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center text-black transition hover:text-slate-700"
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

          <div className="px-4 py-4">
            <nav aria-label="Sidebar navigation" className="space-y-6">
              <section>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/70">
                  Categories
                </p>
                <ul className="mt-4 space-y-3">
                  <li>
                    <Link
                      href="/"
                      onClick={() => setIsMenuOpen(false)}
                      className={`text-sm uppercase tracking-[0.14em] ${
                        pathname === "/" && activeCategory === null
                          ? "text-black underline decoration-2 underline-offset-4"
                          : "text-black/75 hover:text-black"
                      }`}
                    >
                      All
                    </Link>
                  </li>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <li key={category}>
                      <Link
                        href={`/?category=${category.toLowerCase()}`}
                        onClick={() => setIsMenuOpen(false)}
                        className={`text-sm uppercase tracking-[0.14em] ${
                          pathname === "/" && activeCategory === category
                            ? "text-black underline decoration-2 underline-offset-4"
                            : "text-black/75 hover:text-black"
                        }`}
                      >
                        {PRODUCT_CATEGORY_LABELS[category]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="border-t border-black/10 pt-4">
                <Link
                  href="/account"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm uppercase tracking-[0.14em] text-black/75 hover:text-black"
                >
                  Account
                </Link>
              </section>
            </nav>
          </div>
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
          className="absolute inset-0 bg-black/20"
        />

        <aside
          id="storefront-cart-sidebar"
          className={`absolute right-0 top-0 flex h-full w-full flex-col border-l border-slate-300 bg-white transition-transform duration-300 sm:w-[30rem] ${
            isCartOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-20 items-center justify-between px-6">
            <p className="text-base font-light uppercase tracking-tight text-black">
              {cart.itemCount} items in your cart
            </p>
            <button
              type="button"
              aria-label="Close cart"
              onClick={closeCart}
              className="inline-flex h-10 w-10 items-center justify-center text-slate-900 transition hover:text-black"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-8 w-8"
              >
                <path strokeLinecap="round" d="m6 6 12 12" />
                <path strokeLinecap="round" d="m18 6-12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {errorMessage ? (
              <p className="mb-4 border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            {cart.adjustments.length > 0 ? (
              <div className="mb-4 border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
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
              <p className="text-sm text-slate-700">Loading cart...</p>
            ) : cart.items.length === 0 ? (
              <p className="px-2 py-2 text-sm text-slate-700">
                Your cart is empty.
              </p>
            ) : (
              <ul className="space-y-8">
                {cart.items.map((item) => (
                  <li key={item.id}>
                    <div className="flex gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-40 w-32 bg-slate-300 object-cover"
                      />

                      <div className="min-w-0 flex h-40 flex-1 flex-col">
                        <div>
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={closeCart}
                            className="line-clamp-2 text-base font-semibold leading-tight text-black hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-2 text-base text-black">
                            {formatPrice(item.priceInCents)}
                          </p>
                          <p className="mt-3 text-sm uppercase tracking-wide text-black">
                            One size
                          </p>
                        </div>

                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                void setQuantity(item.id, item.productId, item.quantity - 1)
                              }
                              disabled={isMutating}
                              className="inline-flex h-10 w-10 items-center justify-center text-2xl font-light leading-none text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="inline-flex w-10 items-center justify-center text-xl font-light text-black">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void setQuantity(item.id, item.productId, item.quantity + 1)
                              }
                              disabled={isMutating || item.quantity >= item.maxAllowedQuantity}
                              className="inline-flex h-10 w-10 items-center justify-center text-2xl font-light leading-none text-black disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => void remove(item.id, item.productId)}
                            disabled={isMutating}
                            className="text-sm font-light leading-none text-slate-500 underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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

          <div className="px-6 py-6">
            <div className="flex items-center justify-between text-base uppercase text-black">
              <span>Subtotal</span>
              <span className="font-semibold">{formatPrice(cart.subtotalInCents)} USD</span>
            </div>
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
                className="mt-6 inline-flex h-14 w-full items-center justify-center bg-black px-4 text-base font-light uppercase tracking-wide text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCheckingOut ? "Redirecting..." : "Checkout"}
              </button>
            ) : (
              <Link
                href="/auth"
                onClick={closeCart}
                className="mt-6 inline-flex h-14 w-full items-center justify-center bg-black px-4 text-base font-medium uppercase tracking-wide text-white transition hover:bg-black/90"
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
