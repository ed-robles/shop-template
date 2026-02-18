"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type AccountPageClientProps = {
  name: string;
  email: string;
  emailVerified?: boolean | null;
  createdAtLabel?: string | null;
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

export default function AccountPageClient({
  name,
  email,
  emailVerified,
  createdAtLabel,
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
    </section>
  );
}
