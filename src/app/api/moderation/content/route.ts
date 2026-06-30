import { NextResponse } from "next/server";
import { requireModerator } from "@/lib/require-moderator";

export async function POST(req: Request) {
  const check = await requireModerator(req);
  if (check instanceof NextResponse) return check;

  const body = await req.json().catch(() => null);
  // basic moderation action placeholder: accept a content id and action
  const { contentId, action } = body ?? {};
  if (!contentId || !action) return NextResponse.json({ error: "Missing contentId or action" }, { status: 400 });

  // TODO: connect to DB and perform moderation (approve/remove/flag)
  return NextResponse.json({ success: true, contentId, action });
}
