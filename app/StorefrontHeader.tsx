"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function StorefrontHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  return (
    <>
      <header className="h-12 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4">
          <span className="text-xs font-semibold uppercase tracking-[0.24em]">
            Shop Template
          </span>

          <div className="flex items-center gap-1">
            <Link
              href="/auth"
              aria-label="Open sign in and sign up page"
              className="inline-flex h-9 w-9 items-center justify-center text-slate-700"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                className="h-5 w-5"
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
              className="inline-flex h-9 w-9 items-center justify-center text-slate-700"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-5 w-5"
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
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center text-slate-700"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-5 w-5"
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
