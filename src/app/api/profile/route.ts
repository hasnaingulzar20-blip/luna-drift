import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayKey, ensureProfile } from "@/lib/journal";

export async function GET(req: Request) {
  try {
    const profile = await ensureProfile();

    // constellation window — offset 0 = the last 35 days ending tonight,
    // offset N = the 35-day window N*35 days further back (month navigation)
    const url = new URL(req.url);
    const raw = Number(url.searchParams.get("monthOffset") ?? "0");
    const offset = Number.isFinite(raw) ? Math.min(11, Math.max(0, Math.floor(raw))) : 0;

    // last 35 days, oldest → newest (feeds both the week chart and the constellation)
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - offset * 35);

    const since = new Date(end);
    since.setDate(end.getDate() - 34);

    const windowSessions = await db.sleepSession.findMany({
      where: { profileId: profile.id, endedAt: { gte: since } },
      select: { minutes: true, endedAt: true },
    });

    const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const week: { day: string; minutes: number }[] = [];
    const month: { date: string; day: string; minutes: number }[] = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = dayKey(d);
      const minutes = windowSessions
        .filter((s) => dayKey(s.endedAt) === key)
        .reduce((sum, s) => sum + s.minutes, 0);
      // the week chart always shows the current week, whatever window is navigated
      if (i >= 28 && offset === 0) {
        week.push({ day: dayLabels[d.getDay()], minutes });
      }
      month.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        day: dayLabels[d.getDay()],
        minutes,
      });
    }

    // default payload keeps its week data; navigated windows return week: null
    const weekData = offset === 0 ? week : null;

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
        select: { soundscape: true, minutes: true, endedAt: true },
      }),
    ]);

    // ── night rhythm: which hours of the day actually hold the listening ──
    // each session's minutes are spread across the hours it spanned,
    // so a 45-minute drift ending 23:30 lights 22:00 and 23:00 alike
    const nightHours: number[] = Array.from({ length: 24 }, () => 0);
    for (const s of allTime) {
      const endMs = s.endedAt.getTime();
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
    allTime.forEach((s) => bySoundscape.set(s.soundscape, (bySoundscape.get(s.soundscape) ?? 0) + s.minutes));
    const topEntry = [...bySoundscape.entries()].sort((a, b) => b[1] - a[1])[0];

    return NextResponse.json({
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
        endedAt: s.endedAt.toISOString(),
      })),
      insights: {
        sessions: sessionCount,
        avgMinutes,
        bestNight: bestDay,
        topSoundscape: topEntry ? topEntry[0] : null,
        topSoundscapeMinutes: topEntry ? topEntry[1] : 0,
      },
      nightHours,
    });
  } catch (err) {
    console.error("GET /api/profile failed", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
