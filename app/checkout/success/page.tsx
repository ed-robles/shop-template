import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

type SuccessSearchParams = Record<string, string | string[] | undefined>;

type StripeCustomerDetails = {
  email: string | null;
  name: string | null;
};

function getFirstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatCurrency(amountInCents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountInCents / 100);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amountInCents / 100);
  }
}

function toReadableStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

async function getStripeCustomerDetails(sessionId: string) {
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
      email: session.customer_details?.email || session.customer_email || null,
      name: session.customer_details?.name || null,
    } satisfies StripeCustomerDetails;
  } catch {
    return {
      email: null,
      name: null,
    } satisfies StripeCustomerDetails;
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams?: SuccessSearchParams | Promise<SuccessSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const sessionId = getFirstValue(resolvedSearchParams.session_id)?.trim() || null;
  const order = sessionId
    ? await prisma.order.findUnique({
        where: { stripeCheckoutSessionId: sessionId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          items: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      })
    : null;

  const stripeCustomerDetails = sessionId
    ? await getStripeCustomerDetails(sessionId)
    : {
        email: null,
        name: null,
      };

  const customerName = order?.user?.name || stripeCustomerDetails.name;
  const customerEmail =
    order?.customerEmail || order?.user?.email || stripeCustomerDetails.email;

  return (
    <div className="min-h-screen bg-white px-4 py-12 text-slate-900">
      <main className="mx-auto flex w-full max-w-2xl flex-col items-center">
        <section className="w-full max-w-xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Order placed</h1>
          <p className="mt-2 text-sm text-slate-700">
            Payment completed successfully. We received your order.
          </p>

          {order ? (
            <div className="mt-8 space-y-6 rounded-xl bg-slate-50 p-6 text-left">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Customer
                </h2>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">Name:</span>{" "}
                    {customerName || "Not provided"}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Email:</span>{" "}
                    {customerEmail || "Not provided"}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Order
                </h2>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <p>
                    <span className="font-medium text-slate-900">Order ID:</span> {order.id}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Status:</span>{" "}
                    {toReadableStatus(order.status)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Subtotal:</span>{" "}
                    {formatCurrency(order.amountSubtotalInCents, order.currency)}
                  </p>
                  <p>
                    <span className="font-medium text-slate-900">Total:</span>{" "}
                    {formatCurrency(order.amountTotalInCents, order.currency)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Items
                </h3>
                {order.items.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {order.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{item.productName}</p>
                          <p className="text-slate-600">Qty {item.quantity}</p>
                        </div>
                        <p className="font-medium text-slate-900">
                          {formatCurrency(item.lineTotalInCents, order.currency)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No line items recorded yet.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-xl bg-slate-50 p-6 text-sm text-slate-700">
              We could not find order details yet. Please refresh in a few moments or check your
              account orders.
            </div>
          )}

          <div className="mt-8 flex flex-col items-center gap-3">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Continue shopping
            </Link>
            <Link
              href="/account"
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:text-slate-950"
            >
              View account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
