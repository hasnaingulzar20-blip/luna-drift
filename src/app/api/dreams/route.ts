import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureProfile } from "@/lib/journal";

const MOODS = ["calm", "hopeful", "melancholy", "strange", "joyful"] as const;
const MAX_BODY = 400;
const MAX_NOTES = 40;

const dreamSchema = z.object({
  body: z.string().trim().min(1, "A dream needs a few words").max(MAX_BODY, "Keep dreams under 400 characters"),
  mood: z.enum(MOODS).default("calm"),
});

export async function GET() {
  try {
    const profile = await ensureProfile();
    if (!profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
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
    const body = await req.json().catch(() => null);
    const parsed = dreamSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues.map((i) => i.message) },
        { status: 400 }
      );
    }
    const { body: text, mood } = parsed.data;

    const profile = await ensureProfile();
    if (!profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
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
    if (!profile) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
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
