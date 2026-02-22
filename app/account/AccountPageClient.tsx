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
  const [expandedOrderIds, setExpandedOrderIds] = useState<string[]>([]);

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((id) => id !== orderId)
        : [...current, orderId],
    );
  };

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

      <section className="mt-8 bg-white">
        <h2 className="text-3xl font-semibold tracking-tight">Orders</h2>
        <p className="mt-2 text-sm text-black/70">Recent orders tied to your account email.</p>

        {orders.length === 0 ? (
          <p className="mt-4 border border-black bg-white px-4 py-3 text-sm text-black/70">
            No orders yet.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedOrderIds.includes(order.id);

              return (
                <article key={order.id} className="overflow-hidden border border-black bg-white">
                  <button
                    type="button"
                    onClick={() => toggleOrderExpanded(order.id)}
                    className="w-full bg-white px-4 py-3 text-left text-sm font-medium text-black transition hover:bg-zinc-100"
                    aria-expanded={isExpanded}
                    aria-controls={`order-details-${order.id}`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-mono">{order.id}</span>
                      <span className="flex items-center gap-2">
                        <span>{formatCurrency(order.amountTotalInCents, order.currency)}</span>
                        <svg
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                          className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        >
                          <path d="M5 7.5L10 12.5L15 7.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </span>
                    </span>
                  </button>

                  {isExpanded ? (
                    <div id={`order-details-${order.id}`} className="px-4 py-4">
                      <dl className="grid gap-3 text-sm text-black sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-black/70">
                            Status
                          </dt>
                          <dd className="mt-1">{getOrderStatusLabel(order.status)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-black/70">Paid</dt>
                          <dd className="mt-1">{order.paidAtLabel || "Not paid"}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-black/70">
                            Placed
                          </dt>
                          <dd className="mt-1">{order.createdAtLabel}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-black/70">
                            Currency
                          </dt>
                          <dd className="mt-1 uppercase">{order.currency}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-medium uppercase tracking-wider text-black/70">
                            Items
                          </dt>
                          <dd className="mt-1">
                            {order.items.length} item{order.items.length === 1 ? "" : "s"}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-black/70">Items</p>
                        <ul className="mt-2 space-y-2 px-2 py-2">
                          {order.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-3 py-1 text-sm text-black"
                            >
                              <span>
                                {item.productName} x {item.quantity}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(item.lineTotalInCents, order.currency)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
