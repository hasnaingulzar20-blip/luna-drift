import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { dayKey, ensureProfile, recalcStreak } from "@/lib/journal";

const VALID_SOUNDSCAPES = ["rain", "forest", "ocean", "cafe", "fireplace", "piano", "train", "bowls", "snow", "mix"] as const;

const sessionSchema = z.object({
  soundscape: z.enum(VALID_SOUNDSCAPES),
  minutes: z.number().finite().int().min(1).max(480),
  completed: z.boolean(),
});

/** the whole ledger, newest first — feeds the CSV export in the journal */
export async function GET() {
  try {
    const profile = await ensureProfile();
    if (!profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
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
    const parsed = sessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }
    const { soundscape, minutes, completed } = parsed.data;

    const profile = await ensureProfile();
    if (!profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
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
