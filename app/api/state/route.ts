import { NextResponse } from "next/server";
import { getAppState } from "@/lib/db";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
};

export async function GET() {
  try {
    const state = await getAppState();
    return NextResponse.json(state, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to fetch state:", error);
    return NextResponse.json(
      { error: "Failed to load voting data. Please try again." },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
