# Quickstart: Affiliate Leaderboard

## Prerequisites

- Node.js 24 and pnpm 12 (versions used by the project).
- Refersion OAuth client credentials for the challenge account.

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create `.env.local` (never commit it) with the names documented in `.env.example`:

   ```bash
   REFERSION_CLIENT_ID=<client id>
   REFERSION_CLIENT_SECRET=<client secret>
   ```

3. Start the app:

   ```bash
   pnpm dev
   ```

4. Open `http://localhost:3000`.

## Automated checks

```bash
pnpm test          # pure leaderboard logic (eligibility, ordering, top five)
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Validation scenarios

### 1. Happy path (live account)

With the challenge credentials, the page shows five rows. Expected values observed on
2026-11-04 (data may change):

| Rank | Affiliate | Commission |
|------|-----------|------------|
| 1 | Lily Kertzmann | $7,025.13 |
| 2 | Clark Rolfson | $5,748.70 |
| 3 | Peter Bosco | $5,726.66 |
| 4 | Chauncey Hartmann | $5,627.30 |
| 5 | Mitchel Ortiz | $4,772.34 |

Confirm that no row belongs to an affiliate whose "Display in leaderboard" custom field is not
exactly `"TRUE"`.

### 2. Pagination

Confirm in the server logs or by instrumenting the request that the listing stops after the
first page of 44 records (fewer than the requested `limit` of 100) and that no extra page is
requested.

### 3. Loading state

Throttle the network in the browser dev tools (or add a delay in the server module) and reload.
Skeleton rows must appear before the table.

### 4. Error and retry

Set an invalid `REFERSION_CLIENT_SECRET` in `.env.local`, restart, and reload. The page must show
a short error message and a Retry button; credentials or upstream text must not appear in the
UI or the response body. Restore the secret, press Retry, and confirm the table appears without
a full page reload.

### 5. Empty state

Temporarily make the eligibility comparison impossible (for example, in a local experiment,
point the label constant to a non-existent label) and reload. The page must show an explicit
empty message instead of an empty table.

### 6. Accessibility and responsiveness

Navigate the page with the keyboard and a screen reader. The table must announce a caption and
column headers. At a 375 px viewport the table must remain usable via horizontal scrolling
without breaking the layout.
