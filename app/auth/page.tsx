"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthMode =
  | "sign-in"
  | "sign-up"
  | "forgot-password"
  | "reset-password";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [resetToken, setResetToken] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    const verified = params.get("verified");
    const error = params.get("error");

    if (token) {
      setResetToken(token);
      setMode("reset-password");
    }

    if (verified === "1") {
      setMode("sign-in");
      setErrorMessage(null);
      setSuccessMessage("Email verified. You can sign in now.");
    }

    if (error === "INVALID_TOKEN" || error === "invalid_token") {
      setMode("forgot-password");
      setErrorMessage("This reset link is invalid or expired.");
      return;
    }

    if (error === "token_expired") {
      setMode("sign-in");
      setErrorMessage("Verification link expired. Request a new one.");
    }
  }, []);

  const isSignUp = mode === "sign-up";
  const isForgotPassword = mode === "forgot-password";
  const isResetPassword = mode === "reset-password";
  const isAuthFlow = mode === "sign-in" || mode === "sign-up";
  const submitLabel = useMemo(
    () =>
      isSubmitting
        ? "Submitting..."
        : isSignUp
          ? "Create account"
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
        callbackURL: "/",
      });

      if (result.error) {
        const message = result.error.message || "Unable to sign in.";
        setErrorMessage(message);
        if (message.toLowerCase().includes("email not verified")) {
          setNeedsVerification(true);
        }
        return;
      }

      setSuccessMessage("Signed in. Redirecting to homepage...");
      window.location.assign("/");
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
        callbackURL: "/",
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

  const handleSignOut = async () => {
    clearFeedback();
    setNeedsVerification(false);

    await authClient.signOut();
    window.location.assign("/");
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Account access</h1>
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-900"
          >
            Home
          </Link>
        </div>

        {!isSessionPending && session?.user && !isResetPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              Signed in as <span className="font-medium">{session.user.email}</span>.
            </p>
            <button
              onClick={handleSignOut}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        ) : (
          <>
            {isAuthFlow ? (
              <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setModeWithReset("sign-in")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    !isSignUp
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setModeWithReset("sign-up")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    isSignUp
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sign up
                </button>
              </div>
            ) : null}

            <form className="space-y-3" onSubmit={handleEmailSubmit}>
              {isSignUp ? (
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Full name"
                  autoComplete="name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-slate-500"
                />
              ) : null}

              {!isResetPassword ? (
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-slate-500"
                />
              ) : null}

              {!isForgotPassword && !isResetPassword ? (
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-slate-500"
                />
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
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-slate-500"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-slate-500"
                  />
                </>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitLabel}
              </button>
            </form>

            {mode === "sign-in" ? (
              <button
                type="button"
                onClick={() => setModeWithReset("forgot-password")}
                className="mt-3 w-full text-sm text-slate-600 transition hover:text-slate-900"
              >
                Forgot password?
              </button>
            ) : null}

            {mode === "forgot-password" || mode === "reset-password" ? (
              <button
                type="button"
                onClick={() => setModeWithReset("sign-in")}
                className="mt-3 w-full text-sm text-slate-600 transition hover:text-slate-900"
              >
                Back to sign in
              </button>
            ) : null}

            {needsVerification ? (
              <button
                type="button"
                onClick={handleResendVerificationEmail}
                disabled={isResendingVerification}
                className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isResendingVerification
                  ? "Sending verification..."
                  : "Resend verification email"}
              </button>
            ) : null}

            {isAuthFlow ? (
              <>
                <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  <span>or</span>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isGoogleSubmitting}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isGoogleSubmitting
                    ? "Opening Google..."
                    : "Continue with Google"}
                </button>
              </>
            ) : null}
          </>
        )}

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {successMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
