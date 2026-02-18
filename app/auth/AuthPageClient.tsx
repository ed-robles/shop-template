"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthMode =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password";

export type AuthPageInitialQueryState = {
  token?: string;
  verified?: string;
  error?: string;
};

function getInitialModeFromQuery(initialQueryState: AuthPageInitialQueryState) {
  if (initialQueryState.token) {
    return "reset-password";
  }

  if (
    initialQueryState.error === "INVALID_TOKEN" ||
    initialQueryState.error === "invalid_token"
  ) {
    return "forgot-password";
  }

  return "sign-in";
}

function getInitialSuccessMessage(initialQueryState: AuthPageInitialQueryState) {
  if (initialQueryState.verified === "1") {
    return "Email verified. You can sign in now.";
  }

  return null;
}

function getInitialErrorMessage(initialQueryState: AuthPageInitialQueryState) {
  if (
    initialQueryState.error === "INVALID_TOKEN" ||
    initialQueryState.error === "invalid_token"
  ) {
    return "This reset link is invalid or expired.";
  }

  if (initialQueryState.error === "token_expired") {
    return "Verification link expired. Request a new one.";
  }

  return null;
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 256 262"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
      />
      <path
        fill="#34A853"
        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
      />
      <path
        fill="#FBBC05"
        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
      />
      <path
        fill="#EB4335"
        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
      />
    </svg>
  );
}

export default function AuthPageClient({
  initialQueryState,
}: {
  initialQueryState: AuthPageInitialQueryState;
}) {
  const [mode, setMode] = useState<AuthMode>(
    getInitialModeFromQuery(initialQueryState),
  );
  const [resetToken, setResetToken] = useState(initialQueryState.token || "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    getInitialErrorMessage(initialQueryState),
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(
    getInitialSuccessMessage(initialQueryState),
  );

  const isSignUp = mode === "sign-up";
  const isForgotPassword = mode === "forgot-password";
  const isResetPassword = mode === "reset-password";
  const isAuthFlow = mode === "sign-in" || mode === "sign-up";
  const submitLabel = useMemo(
    () =>
      isSubmitting
        ? "Submitting..."
        : isSignUp
          ? "Create an account"
          : isForgotPassword
            ? "Send reset link"
            : isResetPassword
              ? "Reset password"
              : "Sign in",
    [isForgotPassword, isResetPassword, isSignUp, isSubmitting],
  );

  const clearFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const setModeWithReset = (nextMode: AuthMode) => {
    setMode(nextMode);
    setNeedsVerification(false);
    clearFeedback();
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearFeedback();
    setNeedsVerification(false);
    setIsSubmitting(true);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    try {
      if (isForgotPassword) {
        const result = await authClient.requestPasswordReset({
          email: normalizedEmail,
          redirectTo: `${window.location.origin}/auth`,
        });

        if (result.error) {
          setErrorMessage(result.error.message || "Unable to send reset email.");
          return;
        }

        setSuccessMessage(
          "If that email exists, a password reset link has been sent.",
        );
        return;
      }

      if (isResetPassword) {
        if (!resetToken) {
          setErrorMessage("Reset token is missing.");
          return;
        }

        if (newPassword.length < 8) {
          setErrorMessage("New password must be at least 8 characters.");
          return;
        }

        if (newPassword !== confirmPassword) {
          setErrorMessage("Passwords do not match.");
          return;
        }

        const result = await authClient.resetPassword({
          token: resetToken,
          newPassword,
        });

        if (result.error) {
          setErrorMessage(result.error.message || "Unable to reset password.");
          return;
        }

        setNewPassword("");
        setConfirmPassword("");
        setResetToken("");
        setMode("sign-in");
        window.history.replaceState({}, "", "/auth");
        setSuccessMessage("Password reset complete. Sign in with your new password.");
        return;
      }

      if (isSignUp) {
        const result = await authClient.signUp.email({
          email: normalizedEmail,
          password,
          name: normalizedName || normalizedEmail.split("@")[0] || "Customer",
          callbackURL: `${window.location.origin}/auth?verified=1`,
        });

        if (result.error) {
          setErrorMessage(result.error.message || "Unable to create account.");
          return;
        }

        setMode("sign-in");
        setNeedsVerification(true);
        setSuccessMessage("Account created. Verify your email to sign in.");
        return;
      }

      const result = await authClient.signIn.email({
        email: normalizedEmail,
        password,
        callbackURL: "/account",
      });

      if (result.error) {
        const message = result.error.message || "Unable to sign in.";
        setErrorMessage(message);
        if (message.toLowerCase().includes("email not verified")) {
          setNeedsVerification(true);
        }
        return;
      }

      window.location.assign("/account");
    } catch {
      setErrorMessage("Authentication request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage("Enter your email first.");
      return;
    }

    clearFeedback();
    setIsResendingVerification(true);

    try {
      const result = await authClient.sendVerificationEmail({
        email: normalizedEmail,
        callbackURL: `${window.location.origin}/auth?verified=1`,
      });

      if (result.error) {
        setErrorMessage(
          result.error.message || "Unable to resend verification email.",
        );
        return;
      }

      setSuccessMessage("Verification email sent.");
    } catch {
      setErrorMessage("Unable to resend verification email.");
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearFeedback();
    setNeedsVerification(false);
    setIsGoogleSubmitting(true);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/account",
      });

      if (result?.error) {
        setErrorMessage(result.error.message || "Google sign-in failed.");
      }
    } catch {
      setErrorMessage("Google sign-in failed.");
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-12 text-black">
      <div className="mx-auto w-full max-w-md bg-white p-6">
        <div className="mb-6 flex justify-center pb-4">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.24em]"
          >
            Shop Template
          </Link>
        </div>

        <>
          {isAuthFlow ? (
            <div className="mb-5 grid grid-cols-2 gap-2 border border-black p-1">
              <button
                type="button"
                onClick={() => setModeWithReset("sign-in")}
                className={`px-3 py-2 text-sm font-medium transition ${
                  !isSignUp
                    ? "bg-black text-white"
                    : "text-black hover:bg-zinc-100"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setModeWithReset("sign-up")}
                className={`px-3 py-2 text-sm font-medium transition ${
                  isSignUp
                    ? "bg-black text-white"
                    : "text-black hover:bg-zinc-100"
                }`}
              >
                Sign up
              </button>
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={handleEmailSubmit}>
            {isSignUp ? (
              <div className="space-y-1">
                <label htmlFor="auth-name" className="block text-sm font-medium text-black">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="name"
                  autoComplete="name"
                  className="w-full rounded-none border border-black bg-white px-3 py-2.5 text-sm text-black outline-none ring-0 transition placeholder:text-black/50 focus:border-black"
                />
              </div>
            ) : null}

            {!isResetPassword ? (
              <div className="space-y-1">
                <label htmlFor="auth-email" className="block text-sm font-medium text-black">
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-none border border-black bg-white px-3 py-2.5 text-sm text-black outline-none ring-0 transition placeholder:text-black/50 focus:border-black"
                />
              </div>
            ) : null}

            {!isForgotPassword && !isResetPassword ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="block text-sm font-medium text-black"
                  >
                    Password
                  </label>
                  {mode === "sign-in" ? (
                    <button
                      type="button"
                      onClick={() => setModeWithReset("forgot-password")}
                      className="cursor-pointer text-xs text-black transition hover:opacity-70"
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  className="w-full rounded-none border border-black bg-white px-3 py-2.5 text-sm text-black outline-none ring-0 transition placeholder:text-black/50 focus:border-black"
                />
              </div>
            ) : null}

            {isResetPassword ? (
              <>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full rounded-none border border-black bg-white px-3 py-2.5 text-sm text-black outline-none ring-0 transition placeholder:text-black/50 focus:border-black"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full rounded-none border border-black bg-white px-3 py-2.5 text-sm text-black outline-none ring-0 transition placeholder:text-black/50 focus:border-black"
                />
              </>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${
                isAuthFlow
                  ? "border border-black bg-black text-white hover:bg-black/90"
                  : "border border-black bg-white text-black hover:bg-zinc-100"
              }`}
            >
              {submitLabel}
            </button>
          </form>

          {mode === "forgot-password" || mode === "reset-password" ? (
            <button
              type="button"
              onClick={() => setModeWithReset("sign-in")}
              className="mt-3 w-full text-sm text-black transition hover:opacity-70"
            >
              Back to sign in
            </button>
          ) : null}

          {needsVerification ? (
            <button
              type="button"
              onClick={handleResendVerificationEmail}
              disabled={isResendingVerification}
              className="mt-3 w-full border border-black bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isResendingVerification
                ? "Sending verification..."
                : "Resend verification email"}
            </button>
          ) : null}

          {isAuthFlow ? (
            <>
              <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-black/70">
                <span className="h-px flex-1 bg-black/30" />
                <span>or</span>
                <span className="h-px flex-1 bg-black/30" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleSubmitting}
                className="flex w-full items-center justify-center gap-2 border border-black bg-white px-4 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <GoogleIcon />
                {isGoogleSubmitting
                  ? "Opening Google..."
                  : "Sign in with Google"}
              </button>
            </>
          ) : null}
        </>

        {errorMessage ? (
          <p className="mt-4 border border-black bg-white px-3 py-2 text-sm text-black">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-4 border border-black bg-white px-3 py-2 text-sm text-black">
            {successMessage}
          </p>
        ) : null}

        <Link
          href="/"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 bg-white px-4 py-2.5 text-sm font-medium text-black"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.25 6.75 9 12l5.25 5.25M9 12h10.5"
            />
          </svg>
          Back
        </Link>
      </div>
    </main>
  );
}
