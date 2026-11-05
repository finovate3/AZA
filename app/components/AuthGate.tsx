"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  tag: string;
  isVerified: boolean;
  onboardingComplete: boolean;
};

type AuthMode = "login" | "signup";

type AuthGateProps = {
    children: (user: AuthUser) => ReactNode;
};

export  default function AuthGate({ children }: AuthGateProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tag, setTag] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = await response.json();

      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("AUTH_CHECK_ERROR:", error);
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      setUser(data.user);
      setPassword("");
    } catch (error) {
      console.error("LOGIN_FRONTEND_ERROR:", error);
      setError("Unable to connect to AZA. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          tag,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      setSuccess("Account created successfully. You can now log in.");

      setName("");
      setEmail("");
      setTag("");
      setPassword("");

      setAuthMode("login");
    } catch (error) {
      console.error("SIGNUP_FRONTEND_ERROR:", error);
      setError("Unable to connect to AZA. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("LOGOUT_FRONTEND_ERROR:", error);
    } finally {
      setUser(null);
      setAuthMode("login");
      setEmail("");
      setPassword("");
    }
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-zinc-700 border-t-orange-500 animate-spin" />
          <p className="text-sm text-zinc-400">
            Checking your AZA session...
          </p>
        </div>
      </main>
    );
  }

  if (user) {
    return (
      <div className="relative min-h-screen">
         {children(user)}

        <button
          onClick={handleLogout}
          className="fixed top-4 right-4 z-50 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-zinc-800"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-black text-white shadow-lg shadow-orange-500/20">
            A
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            AZA
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Your AI-native financial operating system
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-6 flex rounded-xl bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                authMode === "login"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setError("");
                setSuccess("");
              }}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                authMode === "signup"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              Create account
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {authMode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-800">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-800">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in to AZA"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-800">
                  Full name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-800">
                  Email
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-800">
                  AZA tag
                </label>

                <input
                  type="text"
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  placeholder="@yourtag"
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                />

                <p className="mt-1.5 text-xs text-zinc-500">
                  This will be your unique AZA identifier.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-zinc-800">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create AZA account"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Secure access to your AZA financial workspace.
        </p>
      </div>
    </main>
  );
}