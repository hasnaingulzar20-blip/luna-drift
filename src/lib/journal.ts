import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Resolve the authenticated user's profile.
 * Returns null if not authenticated — API routes should 401 in that case.
 * Anonymous users can still use audio (client-side) but cannot persist data.
 */
export async function ensureProfile() {
  let authId: string | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) authId = user.id;
  } catch {
    // No auth context
  }

  if (!authId) return null;

  let profile = await db.profile.findFirst({ where: { authId } });
  if (!profile) {
    profile = await db.profile.create({ data: { authId, name: "Drifter" } });
  }
  return profile;
}

/** recompute the streak from consecutive days that have sessions */
export async function recalcStreak(profileId: string): Promise<number> {
  const sessions = await db.sleepSession.findMany({
    where: { profileId },
    orderBy: { endedAt: "desc" },
    select: { endedAt: true },
  });
  const days = new Set(sessions.map((s) => dayKey(s.endedAt)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
