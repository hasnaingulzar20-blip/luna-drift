import { createClient } from "@/lib/supabase/client";

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export interface Profile {
  id: string;
  authId: string | null;
  name: string;
  streak: number;
  totalMinutes: number;
  lastSessionDay: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SleepSessionRow {
  id: string;
  profileId: string;
  soundscape: string;
  minutes: number;
  completed: boolean;
  endedAt: string;
}

export interface DreamRow {
  id: string;
  profileId: string;
  body: string;
  mood: string;
  createdAt: string;
}

const VALID_SOUNDSCAPES = [
  "rain", "forest", "ocean", "cafe", "fireplace",
  "piano", "train", "bowls", "snow", "mix",
] as const;

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Resolve the authenticated user's profile.
 * Returns null if not authenticated — callers should handle gracefully.
 */
export async function ensureProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("Profile")
    .select("*")
    .eq("authId", user.id)
    .maybeSingle();

  if (existing) return existing as Profile;

  const { data: created, error } = await supabase
    .from("Profile")
    .insert({ authId: user.id, name: "Drifter" })
    .select()
    .single();

  if (error || !created) return null;
  return created as Profile;
}

/** Recompute the streak from consecutive days that have sessions */
async function recalcStreak(profileId: string): Promise<number> {
  const supabase = createClient();
  const { data: sessions } = await supabase
    .from("SleepSession")
    .select("endedAt")
    .eq("profileId", profileId)
    .order("endedAt", { ascending: false });

  if (!sessions || sessions.length === 0) return 0;

  const days = new Set(sessions.map((s) => dayKey(new Date(s.endedAt))));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Record a sleep session (replaces POST /api/sessions) */
export async function recordSession(payload: {
  soundscape: string;
  minutes: number;
  completed: boolean;
}): Promise<{ ok: true; streak: number; newDay: boolean } | { ok: false; error: string }> {
  const profile = await ensureProfile();
  if (!profile) return { ok: false, error: "Authentication required" };

  if (!VALID_SOUNDSCAPES.includes(payload.soundscape as (typeof VALID_SOUNDSCAPES)[number])) {
    return { ok: false, error: "Invalid soundscape" };
  }
  if (!Number.isFinite(payload.minutes) || payload.minutes < 1 || payload.minutes > 480) {
    return { ok: false, error: "Invalid minutes" };
  }

  const supabase = createClient();
  const today = dayKey(new Date());
  const isNewDay = profile.lastSessionDay !== today;

  const { error: insertError } = await supabase.from("SleepSession").insert({
    profileId: profile.id,
    soundscape: payload.soundscape,
    minutes: payload.minutes,
    completed: payload.completed,
  });

  if (insertError) return { ok: false, error: "Failed to record session" };

  const streak = await recalcStreak(profile.id);
  await supabase
    .from("Profile")
    .update({
      totalMinutes: profile.totalMinutes + payload.minutes,
      streak,
      lastSessionDay: today,
    })
    .eq("id", profile.id);

  return { ok: true, streak, newDay: isNewDay };
}

export interface JournalData {
  name: string;
  streak: number;
  totalMinutes: number;
  week: { day: string; minutes: number }[] | null;
  month: { date: string; day: string; minutes: number }[];
  monthOffset: number;
  recent: { id: string; soundscape: string; minutes: number; completed: boolean; endedAt: string }[];
  insights: {
    sessions: number;
    avgMinutes: number;
    bestNight: { day: string; minutes: number } | null;
    topSoundscape: string | null;
    topSoundscapeMinutes: number;
  };
  nightHours: number[];
}

/** Get journal data (replaces GET /api/profile) */
export async function getJournalData(rawOffset?: number): Promise<JournalData | null> {
  const profile = await ensureProfile();
  if (!profile) return null;

  const offset =
    Number.isFinite(rawOffset)
      ? Math.min(11, Math.max(0, Math.floor(rawOffset as number)))
      : 0;

  const supabase = createClient();

  // 35-day window
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() - offset * 35);
  const since = new Date(end);
  since.setDate(end.getDate() - 34);

  const { data: windowSessions } = await supabase
    .from("SleepSession")
    .select("minutes,endedAt")
    .eq("profileId", profile.id)
    .gte("endedAt", since.toISOString());

  const wSessions = (windowSessions ?? []) as { minutes: number; endedAt: string }[];

  const week: { day: string; minutes: number }[] = [];
  const month: { date: string; day: string; minutes: number }[] = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = dayKey(d);
    const minutes = wSessions
      .filter((s) => dayKey(new Date(s.endedAt)) === key)
      .reduce((sum, s) => sum + s.minutes, 0);
    if (i >= 28 && offset === 0) {
      week.push({ day: dayLabels[d.getDay()], minutes });
    }
    month.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      day: dayLabels[d.getDay()],
      minutes,
    });
  }

  const weekData = offset === 0 ? week : null;

  const { data: recentRows } = await supabase
    .from("SleepSession")
    .select("*")
    .eq("profileId", profile.id)
    .order("endedAt", { ascending: false })
    .limit(8);

  const recent = (recentRows ?? []) as SleepSessionRow[];

  // all-time for insights + night rhythm
  const { data: allRows } = await supabase
    .from("SleepSession")
    .select("soundscape,minutes,endedAt")
    .eq("profileId", profile.id);

  const allTime = (allRows ?? []) as { soundscape: string; minutes: number; endedAt: string }[];
  const sessionCount = allTime.length;

  // night rhythm histogram
  const nightHours: number[] = Array.from({ length: 24 }, () => 0);
  for (const s of allTime) {
    const endMs = new Date(s.endedAt).getTime();
    const startMs = endMs - s.minutes * 60_000;
    let cursor = startMs;
    while (cursor < endMs) {
      const d = new Date(cursor);
      const hourEnd = new Date(d);
      hourEnd.setMinutes(60, 0, 0);
      const overlapEnd = Math.min(endMs, hourEnd.getTime());
      nightHours[d.getHours()] += (overlapEnd - cursor) / 60_000;
      cursor = overlapEnd;
    }
  }
  for (let h = 0; h < 24; h++) nightHours[h] = Math.round(nightHours[h]);

  const avgMinutes = sessionCount
    ? Math.round(allTime.reduce((sum, s) => sum + s.minutes, 0) / sessionCount)
    : 0;

  const bestDay = week.reduce<{ day: string; minutes: number } | null>(
    (best, d) => (d.minutes > 0 && (!best || d.minutes > best.minutes) ? d : best),
    null
  );

  const bySoundscape = new Map<string, number>();
  allTime.forEach((s) =>
    bySoundscape.set(s.soundscape, (bySoundscape.get(s.soundscape) ?? 0) + s.minutes)
  );
  const topEntry = [...bySoundscape.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    name: profile.name,
    streak: profile.streak,
    totalMinutes: profile.totalMinutes,
    week: weekData,
    month,
    monthOffset: offset,
    recent: recent.map((s) => ({
      id: s.id,
      soundscape: s.soundscape,
      minutes: s.minutes,
      completed: s.completed,
      endedAt: s.endedAt,
    })),
    insights: {
      sessions: sessionCount,
      avgMinutes,
      bestNight: bestDay,
      topSoundscape: topEntry ? topEntry[0] : null,
      topSoundscapeMinutes: topEntry ? topEntry[1] : 0,
    },
    nightHours,
  };
}

/** Get the full sessions ledger (replaces GET /api/sessions) */
export async function getSessionsLedger(): Promise<{
  sessions: { soundscape: string; minutes: number; completed: boolean; endedAt: string }[];
} | null> {
  const profile = await ensureProfile();
  if (!profile) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from("SleepSession")
    .select("soundscape,minutes,completed,endedAt")
    .eq("profileId", profile.id)
    .order("endedAt", { ascending: false })
    .limit(500);

  return { sessions: (data ?? []) as { soundscape: string; minutes: number; completed: boolean; endedAt: string }[] };
}

const MOODS = ["calm", "hopeful", "melancholy", "strange", "joyful"] as const;
const MAX_BODY = 400;

/** Get dreams (replaces GET /api/dreams) */
export async function getDreams(): Promise<{ dreams: DreamRow[] } | null> {
  const profile = await ensureProfile();
  if (!profile) return null;

  const supabase = createClient();
  const { data } = await supabase
    .from("DreamNote")
    .select("*")
    .eq("profileId", profile.id)
    .order("createdAt", { ascending: false })
    .limit(40);

  return { dreams: (data ?? []) as DreamRow[] };
}

/** Save a dream (replaces POST /api/dreams) */
export async function saveDream(payload: {
  body: string;
  mood: string;
}): Promise<{ dream: DreamRow } | { error: string }> {
  const body = payload.body.trim();
  if (!body) return { error: "A dream needs a few words" };
  if (body.length > MAX_BODY) return { error: "Keep dreams under 400 characters" };
  if (!MOODS.includes(payload.mood as (typeof MOODS)[number])) {
    return { error: "Invalid mood" };
  }

  const profile = await ensureProfile();
  if (!profile) return { error: "Authentication required" };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("DreamNote")
    .insert({ profileId: profile.id, body, mood: payload.mood })
    .select()
    .single();

  if (error || !data) return { error: "Failed to save dream" };
  return { dream: data as DreamRow };
}

/** Delete a dream (replaces DELETE /api/dreams) */
export async function deleteDream(id: string): Promise<{ ok: true } | { error: string }> {
  const profile = await ensureProfile();
  if (!profile) return { error: "Authentication required" };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("DreamNote")
    .select("profileId")
    .eq("id", id)
    .maybeSingle();

  if (!existing || existing.profileId !== profile.id) {
    return { error: "Dream not found" };
  }

  const { error } = await supabase.from("DreamNote").delete().eq("id", id);
  if (error) return { error: "Failed to delete dream" };
  return { ok: true };
}
