import { NextRequest, NextResponse } from "next/server";
import { createWriteIn } from "@/lib/db";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, destination } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400, headers: HEADERS }
      );
    }

    if (!destination || typeof destination !== "string" || !destination.trim()) {
      return NextResponse.json(
        { error: "Destination name is required." },
        { status: 400, headers: HEADERS }
      );
    }

    if (destination.trim().length > 60) {
      return NextResponse.json(
        { error: "Destination name must be 60 characters or fewer." },
        { status: 400, headers: HEADERS }
      );
    }

    const optionId = await createWriteIn(name, destination);

    return NextResponse.json(
      { success: true, optionId },
      { headers: HEADERS }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    console.error("Write-in failed:", error);

    if (message.includes("already exists")) {
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
