import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionWithEmail = {
  user?: {
    email?: string | null;
  } | null;
} | null;

export async function getAuthenticatedUserId(request: Request) {
  const session = (await auth.api.getSession({
    headers: request.headers,
  })) as SessionWithEmail;

  const email = session?.user?.email?.trim();
  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return user?.id || null;
}
