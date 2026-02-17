import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="h-12 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between px-4">
          <span className="text-xs font-semibold uppercase tracking-[0.24em]">
            Shop Template
          </span>
          <Link
            href="/auth"
            aria-label="Open sign in and sign up page"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0"
              />
            </svg>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col px-4 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="mt-3 max-w-xl text-sm text-slate-600">
          Your storefront foundation is ready. Use the profile icon in the
          header to create an account or sign in.
        </p>
      </main>
    </div>
  );
}
