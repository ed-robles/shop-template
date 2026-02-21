import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { StorefrontHeader } from "../StorefrontHeader";
import AccountPageClient from "./AccountPageClient";

type SessionWithUser = {
  user?: {
    name?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    createdAt?: string | Date | null;
  } | null;
} | null;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function formatCreatedAt(createdAt?: string | Date | null) {
  if (!createdAt) {
    return null;
  }

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return dateFormatter.format(parsedDate);
}

export default async function AccountPage() {
  const reqHeaders = await headers();
  const session = (await auth.api.getSession({
    headers: reqHeaders,
  })) as SessionWithUser;
  const user = session?.user;
  const userEmail = user?.email?.trim();

  if (!userEmail) {
    redirect("/auth");
  }

  const userRecord = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true },
  });
  const orders = await prisma.order.findMany({
    where: userRecord
      ? {
          OR: [{ userId: userRecord.id }, { customerEmail: userEmail }],
        }
      : {
          customerEmail: userEmail,
        },
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
  });

  return (
    <div className="min-h-screen bg-white text-black">
      <StorefrontHeader />
      <main>
        <AccountPageClient
          name={user?.name?.trim() || "Customer"}
          email={userEmail}
          emailVerified={user?.emailVerified}
          createdAtLabel={formatCreatedAt(user?.createdAt)}
          orders={orders.map((order) => ({
            id: order.id,
            status: order.status,
            currency: order.currency,
            amountTotalInCents: order.amountTotalInCents,
            createdAtLabel: formatCreatedAt(order.createdAt) || "Unknown",
            paidAtLabel: formatCreatedAt(order.paidAt),
            items: order.items.map((item) => ({
              id: item.id,
              productName: item.productName,
              quantity: item.quantity,
              lineTotalInCents: item.lineTotalInCents,
            })),
          }))}
        />
      </main>
    </div>
  );
}
