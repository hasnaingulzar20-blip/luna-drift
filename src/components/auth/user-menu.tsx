"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, LogOut, Loader2 } from "lucide-react";

export default function UserMenu() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ? { email: user.email ?? null } : null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { email: session.user.email ?? null } : null);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setOpen(false);
    router.refresh();
  };

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-mist-500" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-moon-100 ring-1 ring-moon-200/25 transition hover:bg-moon-200/10"
      >
        <User className="h-3.5 w-3.5" aria-hidden="true" />
        Sign in
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium text-moon-100 ring-1 ring-moon-200/25 transition hover:bg-moon-200/10"
      >
        <User className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="max-w-[100px] truncate">{user.email?.split("@")[0]}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-moon-200/15 bg-night-900/95 p-2 shadow-xl backdrop-blur-xl">
          <p className="px-3 py-1.5 text-[10px] text-mist-500 truncate">{user.email}</p>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-mist-300 transition hover:bg-moon-200/10 hover:text-moon-100"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
