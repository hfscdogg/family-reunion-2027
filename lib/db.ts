import { sql } from "@vercel/postgres";
import type { Option, Vote, Tally, AppState } from "./types";

export const SEED_OPTIONS = [
  {
    id: "outer-banks",
    name: "Outer Banks, NC",
    description:
      "Massive oceanfront houses, classic extended-family beach week",
  },
  {
    id: "30a-santa-rosa",
    name: "30A / Santa Rosa Beach, FL",
    description: "Walkable beach towns, white sand, margaritas guaranteed",
  },
  {
    id: "hilton-head",
    name: "Hilton Head, SC",
    description: "Bike paths, beach, golf, calmer pace",
  },
  {
    id: "lake-tahoe",
    name: "Lake Tahoe, CA/NV",
    description: "Cool summer, paddleboarding, big cabins",
  },
  {
    id: "park-city",
    name: "Park City, UT",
    description: "Alpine slides, trails, underrated summer",
  },
  {
    id: "asheville-lake-lure",
    name: "Asheville / Lake Lure, NC",
    description: "Blue Ridge mountains, drivable for most",
  },
  {
    id: "the-broadmoor",
    name: "The Broadmoor, CO",
    description: "All-inclusive resort, zero logistics",
  },
];

export async function createTables(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS options (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_writein BOOLEAN DEFAULT FALSE,
      added_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS votes (
      voter_name TEXT PRIMARY KEY,
      voter_display_name TEXT NOT NULL,
      option_id TEXT NOT NULL REFERENCES options(id) ON DELETE CASCADE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_votes_option ON votes(option_id)
  `;
}

export async function seedOptions(): Promise<void> {
  for (const opt of SEED_OPTIONS) {
    await sql`
      INSERT INTO options (id, name, description, is_writein, added_by)
      VALUES (${opt.id}, ${opt.name}, ${opt.description}, FALSE, NULL)
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function getAppState(): Promise<AppState> {
  const optionsResult = await sql`
    SELECT id, name, description, is_writein, added_by, created_at
    FROM options ORDER BY created_at ASC
  `;
  const votesResult = await sql`
    SELECT voter_name, voter_display_name, option_id, updated_at
    FROM votes
  `;

  const options: Option[] = optionsResult.rows.map((row) => ({
    ...row,
    is_writein: row.is_writein === true || row.is_writein === "t",
  })) as Option[];
  const votes: Vote[] = votesResult.rows as Vote[];

  const tallies: Record<string, Tally> = {};
  for (const opt of options) {
    tallies[opt.id] = { option_id: opt.id, count: 0, voters: [] };
  }
  for (const vote of votes) {
    if (tallies[vote.option_id]) {
      tallies[vote.option_id].count++;
      tallies[vote.option_id].voters.push(vote.voter_display_name);
    }
  }

  return { options, votes, tallies };
}

export async function upsertVote(
  name: string,
  optionId: string
): Promise<void> {
  const lowerName = name.toLowerCase().trim();
  const displayName = name.trim();

  // Verify option exists
  const optionCheck = await sql`
    SELECT id FROM options WHERE id = ${optionId}
  `;
  if (optionCheck.rows.length === 0) {
    throw new Error("Option not found");
  }

  await sql`
    INSERT INTO votes (voter_name, voter_display_name, option_id, updated_at)
    VALUES (${lowerName}, ${displayName}, ${optionId}, NOW())
    ON CONFLICT (voter_name)
    DO UPDATE SET option_id = ${optionId}, voter_display_name = ${displayName}, updated_at = NOW()
  `;
}

function normalizeForComparison(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export async function createWriteIn(
  name: string,
  destination: string
): Promise<string> {
  const trimmedDest = destination.trim().slice(0, 60);
  if (!trimmedDest) {
    throw new Error("Destination name is required");
  }

  const normalized = normalizeForComparison(trimmedDest);

  // Check for near-duplicates among existing options
  const existing = await sql`SELECT id, name FROM options`;
  for (const row of existing.rows) {
    if (normalizeForComparison(row.name) === normalized) {
      throw new Error(
        `A similar destination already exists: "${row.name}". Vote for that one instead!`
      );
    }
  }

  const randomPart = Math.random().toString(36).slice(2, 8);
  const optionId = `writein_${Date.now()}_${randomPart}`;
  const displayName = name.trim();

  await sql`
    INSERT INTO options (id, name, description, is_writein, added_by)
    VALUES (${optionId}, ${trimmedDest}, ${`Added by ${displayName}`}, TRUE, ${displayName})
  `;

  // Auto-vote the creator for their write-in
  await upsertVote(name, optionId);

  return optionId;
}

export async function resetVotes(): Promise<void> {
  await sql`DELETE FROM votes`;
}
