import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayKey, ensureProfile } from "@/lib/journal";

export async function GET() {
  try {
    const profile = await ensureProfile();

    // last 7 days, oldest → newest
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 6);

    const weekSessions = await db.sleepSession.findMany({
      where: { profileId: profile.id, endedAt: { gte: since } },
      select: { minutes: true, endedAt: true },
    });

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const week: { day: string; minutes: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = dayKey(d);
      const minutes = weekSessions
        .filter((s) => dayKey(s.endedAt) === key)
        .reduce((sum, s) => sum + s.minutes, 0);
      week.push({ day: dayLabels[d.getDay()], minutes });
    }

    const recent = await db.sleepSession.findMany({
      where: { profileId: profile.id },
      orderBy: { endedAt: "desc" },
      take: 8,
    });

    // ── insights ──
    const [sessionCount, allTime] = await Promise.all([
      db.sleepSession.count({ where: { profileId: profile.id } }),
      db.sleepSession.findMany({
        where: { profileId: profile.id },
        select: { soundscape: true, minutes: true },
      }),
    ]);

    const avgMinutes = sessionCount
      ? Math.round(allTime.reduce((sum, s) => sum + s.minutes, 0) / sessionCount)
      : 0;

    const bestDay = week.reduce<{ day: string; minutes: number } | null>(
      (best, d) => (d.minutes > 0 && (!best || d.minutes > best.minutes) ? d : best),
      null
    );

    const bySoundscape = new Map<string, number>();
    allTime.forEach((s) => bySoundscape.set(s.soundscape, (bySoundscape.get(s.soundscape) ?? 0) + s.minutes));
    const topEntry = [...bySoundscape.entries()].sort((a, b) => b[1] - a[1])[0];

    return NextResponse.json({
      name: profile.name,
      streak: profile.streak,
      totalMinutes: profile.totalMinutes,
      week,
      recent: recent.map((s) => ({
        id: s.id,
        soundscape: s.soundscape,
        minutes: s.minutes,
        completed: s.completed,
        endedAt: s.endedAt.toISOString(),
      })),
      insights: {
        sessions: sessionCount,
        avgMinutes,
        bestNight: bestDay,
        topSoundscape: topEntry ? topEntry[0] : null,
        topSoundscapeMinutes: topEntry ? topEntry[1] : 0,
      },
    });
  } catch (err) {
    console.error("GET /api/profile failed", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
