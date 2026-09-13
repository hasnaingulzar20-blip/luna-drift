"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallback() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const handle = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        router.replace("/login?error=auth");
      } else {
        router.replace("/");
      }
    };
    handle();
  }, [router, supabase]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-night-950">
      <p className="font-serif text-lg text-moon-300 animate-pulse">settling the night…</p>
    </div>
  );
}
