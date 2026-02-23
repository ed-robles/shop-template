import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type AdminOrdersPageProps = {
  searchParams?: Promise<{
    email?: string;
  }>;
};

type AdminOrderStatus =
  | "PAYMENT_PENDING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "STOCK_FAILED";

function getOrderStatusLabel(status: AdminOrderStatus) {
  switch (status) {
    case "PAID":
      return "Paid";
    case "PAYMENT_PENDING":
      return "Payment pending";
    case "PAYMENT_FAILED":
      return "Payment failed";
    case "STOCK_FAILED":
      return "Stock issue";
    default:
      return "Unknown";
  }
}

function formatCurrency(amountInCents: number, currency: string) {
  const normalizedCurrency = currency.toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
    }).format(amountInCents / 100);
  } catch {
    return `$${(amountInCents / 100).toFixed(2)}`;
  }
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const resolvedSearchParams = await searchParams;
  const emailQuery = resolvedSearchParams?.email?.trim() || "";

  const orders = await prisma.order.findMany({
    where: emailQuery
      ? {
          customerEmail: {
            contains: emailQuery,
            mode: "insensitive",
          },
        }
      : undefined,
    include: {
      items: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return (
    <div className="min-h-screen bg-white px-2 py-10 text-slate-900 sm:px-4">
      <div className="mx-auto w-full max-w-5xl rounded-2xl bg-white p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <Link
            href="/admin"
            className="text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-900"
          >
            Back to modules
          </Link>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          View recent orders and expand any row to inspect payment state and
          line-item details.
        </p>

        <form
          className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4"
          action="/admin/orders"
          method="get"
        >
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Search by customer email
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="email"
              name="email"
              type="search"
              defaultValue={emailQuery}
              placeholder="customer@example.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-500"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Search
            </button>
          </div>
        </form>

        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Recent Orders
          </h2>

          {orders.length === 0 ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No orders found{emailQuery ? ` for ${emailQuery}.` : "."}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {orders.map((order) => (
                <details
                  key={order.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm text-slate-800">
                          {order.id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.customerEmail || "No email"} •{" "}
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(order.amountTotalInCents, order.currency)}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {getOrderStatusLabel(order.status)}
                        </p>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-slate-200 px-4 py-4">
                    <dl className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Status
                        </dt>
                        <dd className="mt-1">{getOrderStatusLabel(order.status)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Placed
                        </dt>
                        <dd className="mt-1">{formatDate(order.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Paid
                        </dt>
                        <dd className="mt-1">
                          {formatDate(order.paidAt) || "Not paid"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Customer Email
                        </dt>
                        <dd className="mt-1">{order.customerEmail || "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Subtotal
                        </dt>
                        <dd className="mt-1">
                          {formatCurrency(order.amountSubtotalInCents, order.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          Total
                        </dt>
                        <dd className="mt-1 font-medium text-slate-900">
                          {formatCurrency(order.amountTotalInCents, order.currency)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Items
                      </p>
                      <ul className="mt-2 space-y-2">
                        {order.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                          >
                            <span>
                              {item.productName} x {item.quantity}
                            </span>
                            <span className="font-medium text-slate-900">
                              {formatCurrency(item.lineTotalInCents, order.currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
