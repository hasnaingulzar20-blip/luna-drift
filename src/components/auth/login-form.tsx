"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoonStar, Loader2 } from "lucide-react";

export default function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "otp">("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) setError(error.message);
      else setMessage("Check your email for a confirmation link.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push("/");
    }
    setLoading(false);
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    else setMessage("Check your email for a magic login link.");
    setLoading(false);
  };

  const handleOAuth = async (provider: "google" | "facebook") => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl p-7 shadow-[0_24px_70px_-20px_rgba(2,4,12,0.95)] sm:p-9">
      <div className="mb-6 text-center">
        <MoonStar className="mx-auto mb-3 h-8 w-8 text-moon-300" aria-hidden="true" />
        <h1 className="font-serif text-2xl font-light text-moon-100">
          {mode === "login" && "Welcome back, drifter"}
          {mode === "signup" && "Begin your nights"}
          {mode === "otp" && "A whisper in your inbox"}
        </h1>
        <p className="mt-1.5 text-xs text-mist-400">
          {mode === "login" && "Sign in to keep your nights"}
          {mode === "signup" && "Create an account to save your drifts"}
          {mode === "otp" && "Enter your email for a passwordless login link"}
        </p>
      </div>

      {/* OAuth buttons */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-full bg-white px-4 py-2.5 text-xs font-medium text-night-950 transition hover:bg-mist-200 disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          Continue with Google
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("facebook")}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#1877F2] px-4 py-2.5 text-xs font-medium text-white transition hover:bg-[#1666d1] disabled:opacity-50"
        >
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z"/>
          </svg>
          Continue with Facebook
        </button>
      </div>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-moon-200/15" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-mist-500">or</span>
        <div className="h-px flex-1 bg-moon-200/15" />
      </div>

      {/* Email/password or OTP form */}
      <form onSubmit={mode === "otp" ? handleOtp : handleEmailAuth} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-moon-200/20 bg-night-900/60 px-4 py-2.5 text-sm text-moon-100 placeholder:text-mist-600 focus:border-moon-300/40 focus:outline-none"
        />
        {mode !== "otp" && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-xl border border-moon-200/20 bg-night-900/60 px-4 py-2.5 text-sm text-moon-100 placeholder:text-mist-600 focus:border-moon-300/40 focus:outline-none"
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-moon-200 px-4 py-2.5 text-xs font-medium text-night-950 transition hover:bg-moon-100 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {mode === "login" && "Sign in"}
          {mode === "signup" && "Create account"}
          {mode === "otp" && "Send login link"}
        </button>
      </form>

      {error && <p className="mt-3 text-center text-xs text-red-400">{error}</p>}
      {message && <p className="mt-3 text-center text-xs text-moon-300">{message}</p>}

      {/* Mode switcher */}
      <div className="mt-5 flex flex-wrap justify-center gap-3 text-[11px] text-mist-400">
        <button type="button" onClick={() => setMode("login")} className={`transition hover:text-moon-100 ${mode === "login" ? "text-moon-200" : ""}`}>
          Sign in
        </button>
        <span className="text-mist-700">·</span>
        <button type="button" onClick={() => setMode("signup")} className={`transition hover:text-moon-100 ${mode === "signup" ? "text-moon-200" : ""}`}>
          Sign up
        </button>
        <span className="text-mist-700">·</span>
        <button type="button" onClick={() => setMode("otp")} className={`transition hover:text-moon-100 ${mode === "otp" ? "text-moon-200" : ""}`}>
          Email link (OTP)
        </button>
      </div>
    </div>
  );
}
