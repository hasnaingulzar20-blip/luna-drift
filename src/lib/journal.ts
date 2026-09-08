import { db } from "@/lib/db";

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function ensureProfile() {
  let profile = await db.profile.findFirst();
  if (!profile) {
    profile = await db.profile.create({ data: { name: "Drifter" } });
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
