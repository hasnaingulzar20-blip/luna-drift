import LoginForm from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in — Luna Drift",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-night-950 px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(205,180,124,0.06),transparent_60%)]"
      />
      <div className="relative w-full max-w-sm">
        <LoginForm />
        <p className="mt-5 text-center text-[11px] text-mist-600">
          <a href="/" className="transition hover:text-moon-200">← back to the night</a>
        </p>
      </div>
    </div>
  );
}
