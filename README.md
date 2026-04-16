# Nelson Family Reunion 2027 - Destination Vote

A simple voting app for choosing the family reunion destination. Built with Next.js 14, Vercel Postgres and Tailwind CSS.

## Features

- One vote per person (by name), changeable anytime
- Real-time updates via 5-second polling
- Write-in destinations with duplicate detection
- Mobile-first responsive design
- Persists voter name in localStorage

## Local development

1. Clone this repo and install dependencies:

```bash
npm install
```

2. Copy the example env file and fill in your Postgres connection string:

```bash
cp .env.local.example .env.local
```

Set `POSTGRES_URL` to a Postgres connection string and `INIT_SECRET` to any random string.

3. Initialize the database:

```bash
npm run init-db
```

4. Start the dev server:

```bash
npm run dev
```

Open http://localhost:3000 to see the app.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in the Vercel dashboard (vercel.com/new).
3. In the project settings, go to the **Storage** tab and add a **Vercel Postgres** database. This auto-populates the `POSTGRES_URL` env var.
4. Add an environment variable `INIT_SECRET` with a strong random value.
5. Deploy.
6. After the first deploy, visit `https://your-app.vercel.app/api/init?secret=YOUR_INIT_SECRET` to create tables and seed the default destinations.
7. Share the URL with the family!

## Resetting votes

If you need to clear all votes and start fresh, run this SQL against your Vercel Postgres database:

```sql
DELETE FROM votes;
```

You can do this from the Vercel dashboard under Storage > your database > Query.

To also remove write-in destinations:

```sql
DELETE FROM votes;
DELETE FROM options WHERE is_writein = TRUE;
```

## Database schema

**options** - The destination choices.

| Column | Type | Notes |
|---|---|---|
| id | TEXT (PK) | Stable slug or `writein_<ts>_<rand>` |
| name | TEXT | Display name |
| description | TEXT | Short blurb |
| is_writein | BOOLEAN | True for user-added options |
| added_by | TEXT | Who suggested it (write-ins only) |
| created_at | TIMESTAMPTZ | Auto-set |

**votes** - One row per voter.

| Column | Type | Notes |
|---|---|---|
| voter_name | TEXT (PK) | Lowercased for dedup |
| voter_display_name | TEXT | Original casing for display |
| option_id | TEXT (FK) | References options.id |
| updated_at | TIMESTAMPTZ | Auto-set on upsert |

## API

- `GET /api/state` - Returns all options, votes and tallies
- `POST /api/vote` - Body: `{ name, optionId }`. Upserts by lowercased name.
- `POST /api/writein` - Body: `{ name, destination }`. Creates option and auto-votes.
- `GET /api/init?secret=...` - Creates tables and seeds data (protected by INIT_SECRET).
