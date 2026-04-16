import { NextRequest, NextResponse } from "next/server";
import { upsertVote } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, optionId } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    if (!optionId || typeof optionId !== "string") {
      return NextResponse.json(
        { error: "Please select a destination to vote for." },
        { status: 400 }
      );
    }

    await upsertVote(name, optionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    console.error("Vote failed:", error);

    if (message === "Option not found") {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
