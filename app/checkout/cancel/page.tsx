import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-12">
        <section className="w-full max-w-md bg-white p-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Checkout canceled</h1>
          <p className="mt-2 text-sm text-slate-700">
            Your cart is still saved. You can review it and try checkout again.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Back to shop
            </Link>
            <Link
              href="/account"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:text-slate-950"
            >
              Go to account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
