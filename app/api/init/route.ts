import { NextRequest, NextResponse } from "next/server";
import { createTables, seedOptions } from "@/lib/db";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!process.env.INIT_SECRET) {
    return NextResponse.json(
      { error: "INIT_SECRET environment variable is not configured." },
      { status: 500 }
    );
  }

  if (secret !== process.env.INIT_SECRET) {
    return NextResponse.json({ error: "Invalid secret." }, { status: 401 });
  }

  try {
    await createTables();
    await seedOptions();
    return NextResponse.json({
      success: true,
      message: "Tables created and seed data inserted.",
    });
  } catch (error) {
    console.error("Init failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error during init";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
