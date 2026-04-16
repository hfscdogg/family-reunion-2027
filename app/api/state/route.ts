import { NextResponse } from "next/server";
import { getAppState } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getAppState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("Failed to fetch state:", error);
    return NextResponse.json(
      { error: "Failed to load voting data. Please try again." },
      { status: 500 }
    );
  }
}
