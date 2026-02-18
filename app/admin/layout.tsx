import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail, normalizeEmail } from "@/lib/admin-access";

type SessionWithEmail = {
  user?: {
    email?: string | null;
  } | null;
} | null;

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const reqHeaders = await headers();
  const session = (await auth.api.getSession({
    headers: reqHeaders,
  })) as SessionWithEmail;
  const userEmail = normalizeEmail(session?.user?.email);

  if (!userEmail) {
    redirect("/auth");
  }

  if (!isAdminEmail(userEmail)) {
    notFound();
  }

  return <>{children}</>;
}
