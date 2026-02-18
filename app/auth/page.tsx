import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AuthPageClient, {
  type AuthPageInitialQueryState,
} from "./AuthPageClient";
import { auth } from "@/lib/auth";

type AuthSearchParams = Record<string, string | string[] | undefined>;
type SessionWithEmail = {
  user?: {
    email?: string | null;
  } | null;
} | null;

function getFirstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams?: AuthSearchParams | Promise<AuthSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const reqHeaders = await headers();

  const initialQueryState: AuthPageInitialQueryState = {
    token: getFirstValue(resolvedSearchParams.token),
    verified: getFirstValue(resolvedSearchParams.verified),
    error: getFirstValue(resolvedSearchParams.error),
  };
  const session = (await auth.api.getSession({
    headers: reqHeaders,
  })) as SessionWithEmail;
  const isSignedIn = Boolean(session?.user?.email);
  const isAuthQueryFlow = Boolean(
    initialQueryState.token ||
      initialQueryState.verified ||
      initialQueryState.error,
  );

  if (isSignedIn && !isAuthQueryFlow) {
    redirect("/account");
  }

  return <AuthPageClient initialQueryState={initialQueryState} />;
}
