# Refersion Leaderboard

A small Next.js app that shows the top five eligible affiliates in a Refersion account by
lifetime total commission. This is the deliverable for the
[Refersion Backend Engineer Challenge](docs/refersion-backend-engineer-challenge.md).

## How it works

1. `GET /api/leaderboard` authenticates with the Refersion OAuth client-credentials flow.
2. It lists every affiliate (`page=1`, `limit=100`, stop when a page returns fewer than 100).
3. It reads each affiliate's custom fields and keeps only those with a field labelled exactly
   `Display in leaderboard` whose value is exactly `TRUE`.
4. It ranks them by `performance.total.commission` descending and returns the top five.
5. The page renders the result with TanStack Query, including loading, empty, and error states.

Credentials never reach the browser: the Route Handler is the only thing that talks to
Refersion. The result is cached on the server for 5 minutes, so repeat page loads do not
re-fetch the 44 custom-field records.

## Run locally

Requires Node.js 24 and pnpm 12.

```bash
pnpm install
cp .env.example .env.local   # then fill in the two values
pnpm dev
```

Open <http://localhost:3000>.

| Variable                  | Purpose                          |
| ------------------------- | -------------------------------- |
| `REFERSION_CLIENT_ID`     | OAuth client id                  |
| `REFERSION_CLIENT_SECRET` | OAuth client secret (server only)|

## Commands

```bash
pnpm dev                   # development server
pnpm test                  # pure leaderboard logic (node:test)
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

## Design decisions

- **Server proxy + TanStack Query**: the client queries a local Route Handler so the client
  secret never ships to the browser, while TanStack Query owns loading/error/retry state.
- **Eligibility is exact**: label and `"TRUE"` comparison is case-sensitive and untrimmed.
- **Deterministic ranking**: commission descending, then name ascending, then id ascending.
- **Money**: Refersion's `performance.total.commission` is treated as cents and formatted as
  USD (`702513` → `$7,025.13`). If the API ever reports whole currency units, only
  `formatCommission` in `lib/leaderboard.ts` needs to change.
- **Pagination guard**: 50 pages maximum, so malformed responses cannot loop forever.
- **Concurrency**: custom-field requests are limited to 8 in flight.
- **Errors**: the server logs details and returns `502`/`500` with a generic message. Upstream
  calls time out after 10 seconds instead of hanging.
- **Token resilience**: a `401` triggers one shared token refresh and a retry, because requesting
  a new Refersion token revokes the previous one of the same type.
- **Caching**: `getLeaderboard` uses Next.js `use cache` with `cacheLife({ stale: 300,
  revalidate: 300, expire: 3600 })`. On a single long-running server, a cold load makes 46
  Refersion requests (~3.5 s); loads within 5 minutes use the cached result (~10 ms, zero
  Refersion calls). TanStack Query uses the same 5-minute `staleTime` in the browser.
  The default cache handler is per-instance memory, so serverless instances may each cold-load
  once; use `use cache: remote` if the deployment needs a shared cache.

## Validation performed

- `pnpm test` (9 tests), `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` pass.
- Mocked-fetch tests cover multi-page pagination, a `401` refresh and retry, and a malformed
  payload.
- Live account: 44 affiliates on one page, 22 eligible; the API returned the expected top five
  (Lily Kertzmann `$7,025.13`, Clark Rolfson `$5,748.70`, Peter Bosco `$5,726.66`,
  Chauncey Hartmann `$5,627.30`, Mitchel Ortiz `$4,772.34`).
- Invalid credentials produced `502 {"error":"Unable to load leaderboard."}` with no upstream
  detail leaked.
- After an externally issued token revoked the cached one, the next request recovered with a
  fresh token and returned `200`.

## Unfinished work

- The route handler and UI states have no browser tests; the empty state and the 375 px layout
  were verified by code review and unit tests, not against a live empty account or a real
  mobile browser.
- Multi-page pagination is covered by a mocked test, but the live account only exercises the
  one-page path (44 < 100). The 50-page guard is not tested.
- Rate limiting is not retried automatically. A `429` surfaces as an error with a Retry
  button; there is no `Retry-After` backoff.
- The 401 token-refresh fix assumes a single long-running server. Multiple serverless instances
  can still invalidate each other's cached tokens.

## Next steps

1. Add mocked tests for a `429` response, the 50-page guard, and the route handler's error
   mapping.
2. Add a browser test for the loading, error/retry, and empty states.
3. Add `Retry-After`-aware throttling if the account grows beyond roughly 295 affiliates.
4. Verify against a second account with more than 100 affiliates.
5. Rotate the OAuth client before sharing or deploying this repository, since the credentials
   were distributed with the challenge.
