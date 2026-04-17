import { NextRequest, NextResponse } from "next/server";
import { upsertVote } from "@/lib/db";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, optionId } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400, headers: HEADERS }
      );
    }

    if (!optionId || typeof optionId !== "string") {
      return NextResponse.json(
        { error: "Please select a destination to vote for." },
        { status: 400, headers: HEADERS }
      );
    }

    await upsertVote(name, optionId);

    return NextResponse.json({ success: true }, { headers: HEADERS });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    console.error("Vote failed:", error);

    if (message === "Option not found") {
      return NextResponse.json(
        { error: message },
        { status: 400, headers: HEADERS }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500, headers: HEADERS }
    );
  }
}
