import { headers } from "next/headers";
import AuthPageClient, {
  type AuthPageInitialQueryState,
  type AuthPageInitialSession,
} from "./AuthPageClient";
import { auth } from "@/lib/auth";

type AuthSearchParams = Record<string, string | string[] | undefined>;

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

  const initialSession = (await auth.api.getSession({
    headers: reqHeaders,
  })) as AuthPageInitialSession;

  const initialQueryState: AuthPageInitialQueryState = {
    token: getFirstValue(resolvedSearchParams.token),
    verified: getFirstValue(resolvedSearchParams.verified),
    error: getFirstValue(resolvedSearchParams.error),
  };

  return (
    <AuthPageClient
      initialSession={initialSession}
      initialQueryState={initialQueryState}
    />
  );
}
