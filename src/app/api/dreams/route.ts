import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureProfile } from "@/lib/journal";

const MOODS = ["calm", "hopeful", "melancholy", "strange", "joyful"] as const;
type Mood = (typeof MOODS)[number];

const MAX_BODY = 400;
const MAX_NOTES = 40;

export async function GET() {
  try {
    const profile = await ensureProfile();
    const dreams = await db.dreamNote.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTES,
    });
    return NextResponse.json({
      dreams: dreams.map((d) => ({
        id: d.id,
        body: d.body,
        mood: d.mood,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("GET /api/dreams failed", err);
    return NextResponse.json({ error: "Failed to load dreams" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { body?: unknown; mood?: unknown };
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json({ error: "A dream needs a few words" }, { status: 400 });
    }
    if (text.length > MAX_BODY) {
      return NextResponse.json({ error: "Keep dreams under 400 characters" }, { status: 400 });
    }
    const mood: Mood =
      typeof body.mood === "string" && (MOODS as readonly string[]).includes(body.mood)
        ? (body.mood as Mood)
        : "calm";

    const profile = await ensureProfile();
    const dream = await db.dreamNote.create({
      data: { profileId: profile.id, body: text, mood },
    });
    return NextResponse.json(
      {
        dream: {
          id: dream.id,
          body: dream.body,
          mood: dream.mood,
          createdAt: dream.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/dreams failed", err);
    return NextResponse.json({ error: "Failed to save dream" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing dream id" }, { status: 400 });
    }
    const profile = await ensureProfile();
    const existing = await db.dreamNote.findUnique({ where: { id } });
    if (!existing || existing.profileId !== profile.id) {
      return NextResponse.json({ error: "Dream not found" }, { status: 404 });
    }
    await db.dreamNote.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/dreams failed", err);
    return NextResponse.json({ error: "Failed to delete dream" }, { status: 500 });
  }
}
