"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";

type StorefrontHeaderProps = {
  initialSearchTerm?: string;
};

export function StorefrontHeader({
  initialSearchTerm = "",
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

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

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
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-slate-700"
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
              className="inline-flex h-10 w-10 items-center justify-center text-slate-700"
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

            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center text-slate-700"
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
            </span>

            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="storefront-sidebar"
              onClick={() => setIsMenuOpen(true)}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-slate-700"
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
                className="h-3.5 w-3.5 text-slate-700"
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
    </>
  );
}
