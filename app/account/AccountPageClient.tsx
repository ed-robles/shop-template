"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type AccountOrderStatus =
  | "PAYMENT_PENDING"
  | "PAID"
  | "PAYMENT_FAILED"
  | "STOCK_FAILED";

type AccountOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  lineTotalInCents: number;
};

type AccountOrder = {
  id: string;
  status: AccountOrderStatus;
  currency: string;
  amountTotalInCents: number;
  createdAtLabel: string;
  paidAtLabel?: string | null;
  items: AccountOrderItem[];
};

type AccountPageClientProps = {
  name: string;
  email: string;
  emailVerified?: boolean | null;
  createdAtLabel?: string | null;
  orders: AccountOrder[];
};

function getVerificationLabel(emailVerified?: boolean | null) {
  if (emailVerified === true) {
    return "Verified";
  }

  if (emailVerified === false) {
    return "Not verified";
  }

  return "Unknown";
}

function getOrderStatusLabel(status: AccountOrderStatus) {
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

function getOrderStatusClasses(status: AccountOrderStatus) {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PAYMENT_PENDING":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "PAYMENT_FAILED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "STOCK_FAILED":
      return "border-orange-200 bg-orange-50 text-orange-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
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

export default function AccountPageClient({
  name,
  email,
  emailVerified,
  createdAtLabel,
  orders,
}: AccountPageClientProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      window.location.assign("/");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
      <p className="mt-2 text-sm text-black/70">Your account details</p>

      <div className="mt-6 border border-black p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-black/70">
              Name
            </dt>
            <dd className="mt-1 text-sm text-black">{name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-black/70">
              Email
            </dt>
            <dd className="mt-1 text-sm text-black">{email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-black/70">
              Email status
            </dt>
            <dd className="mt-1 text-sm text-black">
              {getVerificationLabel(emailVerified)}
            </dd>
          </div>
          {createdAtLabel ? (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-black/70">
                Joined
              </dt>
              <dd className="mt-1 text-sm text-black">{createdAtLabel}</dd>
            </div>
          ) : null}
        </dl>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-8 w-full border border-black bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>

      <section className="mt-8 border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold tracking-tight">Orders</h2>
        <p className="mt-2 text-sm text-slate-600">Recent orders tied to your account email.</p>

        {orders.length === 0 ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No orders yet.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">Order</p>
                    <p className="mt-1 font-mono text-sm text-slate-900">{order.id}</p>
                  </div>
                  <p
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getOrderStatusClasses(order.status)}`}
                  >
                    {getOrderStatusLabel(order.status)}
                  </p>
                </div>

                <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-500">Placed</dt>
                    <dd className="mt-1">{order.createdAtLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-500">Paid</dt>
                    <dd className="mt-1">{order.paidAtLabel || "Not paid"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-500">Total</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {formatCurrency(order.amountTotalInCents, order.currency)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-xs uppercase tracking-wider text-slate-500">Items</p>
                  <ul className="mt-2 space-y-2">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 text-sm text-slate-700"
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
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
