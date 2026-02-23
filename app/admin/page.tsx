import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Shop Template
            </p>
            <p className="text-sm font-semibold tracking-tight">Admin</p>
          </div>
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-900"
          >
            Storefront
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Select a module for more information.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/inventory"
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Module 01
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">
              Inventory
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Create products, upload images, and manage product details shown
              on product pages.
            </p>
            <p className="mt-5 text-sm font-medium text-slate-900 group-hover:underline">
              Open module
            </p>
          </Link>

          <Link
            href="/admin/orders"
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Module 02
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Orders</h2>
            <p className="mt-2 text-sm text-slate-600">
              Review recent orders, search by customer email, and inspect
              line-item details in an expandable view.
            </p>
            <p className="mt-5 text-sm font-medium text-slate-900 group-hover:underline">
              Open module
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
