import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayKey, ensureProfile, recalcStreak } from "@/lib/journal";

const VALID = new Set(["rain", "forest", "ocean", "cafe", "fireplace", "piano", "train", "bowls", "mix"]);

/** the whole ledger, newest first — feeds the CSV export in the journal */
export async function GET() {
  try {
    const profile = await ensureProfile();
    const rows = await db.sleepSession.findMany({
      where: { profileId: profile.id },
      orderBy: { endedAt: "desc" },
      take: 500,
    });
    return NextResponse.json({
      sessions: rows.map((s) => ({
        soundscape: s.soundscape,
        minutes: s.minutes,
        completed: s.completed,
        endedAt: s.endedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("GET /api/sessions failed", err);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const soundscape = String(body?.soundscape ?? "mix");
    const minutes = Math.max(0, Math.min(720, Math.round(Number(body?.minutes ?? 0))));
    const completed = Boolean(body?.completed);

    if (!VALID.has(soundscape)) {
      return NextResponse.json({ error: "Unknown soundscape" }, { status: 400 });
    }
    if (minutes < 1) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const profile = await ensureProfile();
    const today = dayKey(new Date());
    const isNewDay = profile.lastSessionDay !== today;

    await db.sleepSession.create({
      data: { profileId: profile.id, soundscape, minutes, completed },
    });

    const streak = await recalcStreak(profile.id);
    await db.profile.update({
      where: { id: profile.id },
      data: {
        totalMinutes: { increment: minutes },
        streak,
        lastSessionDay: today,
      },
    });

    return NextResponse.json({ ok: true, streak, newDay: isNewDay });
  } catch (err) {
    console.error("POST /api/sessions failed", err);
    return NextResponse.json({ error: "Failed to record session" }, { status: 500 });
  }
}
