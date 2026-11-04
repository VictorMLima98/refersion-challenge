# Phase 0 Research: Affiliate Leaderboard

All Technical Context unknowns are resolved below. Findings were verified against the live
challenge account on 2026-11-04 (44 affiliates, 1 page, 22 eligible).

## Authentication

- **Decision**: Exchange the client credentials for a short-lived token at
  `POST https://auth.refersion.com/oauth/token` (form-encoded `client_id`, `client_secret`),
  cache it in module memory until `expires_in` minus a 60-second safety margin, and send
  `Authorization: Bearer <token>` on every API request.
- **Rationale**: Documented OAuth client-credentials flow. Short-lived tokens reduce exposure
  while the in-memory cache avoids a token request per API call.
- **Alternatives considered**: Long-lived (90-day) token — wider leak window for a challenge
  deployment; per-request token — wasteful and unnecessary.

## Affiliate pagination

- **Decision**: `GET /affiliates?page=N&limit=100`, starting at `page=1`, stopping when the
  `data` array contains fewer than 100 records. Cap at 50 pages (5,000 affiliates) and throw a
  typed error if the cap is reached.
- **Rationale**: Matches the challenge instruction exactly; a fixed `limit` makes the stop
  condition unambiguous. The cap prevents an infinite loop on malformed upstream data.
- **Alternatives considered**: Using a count endpoint to precompute page numbers — an extra
  request with no benefit; unbounded loop — unsafe.

## Custom fields per affiliate

- **Decision**: For each affiliate from the listing, call
  `GET /affiliates/{id}/custom-fields` and read `data`; run at most 8 requests concurrently.
- **Rationale**: Required by the challenge. The current account needs 44 + 1 requests, well
  inside the 300 reads/minute limit. Bounded concurrency avoids opening every request at once.
- **Alternatives considered**: Sequential requests — needlessly slow; unbounded `Promise.all` —
  risks rate limiting on larger accounts.

## Eligibility rule

- **Decision**: Eligible only when at least one custom field has `label === "Display in
  leaderboard"` and `value === "TRUE"`, using strict equality with no trimming or case folding.
- **Rationale**: Explicit challenge requirement. Exact equality avoids showing affiliates the
  merchant did not intend to display.
- **Alternatives considered**: Case-insensitive/trimmed matching — would change the meaning of
  the merchant's data.

## Ranking and tie-breaking

- **Decision**: Sort eligible affiliates by `performance.total.commission` descending; ties
  broken by affiliate display name ascending, then numeric id ascending. Take the first five.
- **Rationale**: Deterministic output between loads; the challenge only specifies primary
  ordering.
- **Alternatives considered**: Preserving API order on ties — makes results vary by upstream
  page ordering.

## Commission units and formatting

- **Decision**: Treat the API's `performance.total.commission` integer as minor currency units
  (cents), send it to the client as `commissionCents`, and format with `Intl.NumberFormat`
  (`USD`, two decimals) as `$7,025.13`.
- **Rationale**: The live account returns integer values such as `702513` with no decimal
  component; cents is the only plausible reading at this magnitude. Keeping the raw integer in
  the contract avoids float drift.
- **Alternatives considered**: Treating the value as whole dollars — would overstate the
  leaderboard by 100×.
- **Risk**: The v2026-08 docs do not state the unit explicitly. If it is whole currency, only
  `formatCommission` in `lib/leaderboard.ts` changes.

## Server proxy and client fetching

- **Decision**: `app/api/leaderboard/route.ts` calls the server-only Refersion module and
  returns `{ entries }`. The client uses `useQuery` from TanStack Query v5 with
  `queryKey: ["leaderboard"]`, `staleTime: 30_000`, and `retry: 1`.
- **Rationale**: Keeps credentials off the browser (constitution II) while satisfying the
  challenge's request for TanStack Query-driven loading and error states. The page shell can
  prerender; the data request begins after hydration.
- **Alternatives considered**: Fetching Refersion directly from the browser — exposes the
  client secret. Fetching only in a Server Component — simpler, but does not meet the stated
  TanStack Query requirement.
- **Next.js 16 note**: `cacheComponents` is enabled in `next.config.ts`; do not add
  `dynamic = "force-dynamic"`. The handler uses `fetch(..., { cache: "no-store" })` and returns
  `Cache-Control: no-store`, so it runs per request.

## Server-side cache

- **Decision**: Wrap `getLeaderboard` in Next.js `use cache` with
  `cacheLife({ stale: 300, revalidate: 300, expire: 3600 })`, and set the TanStack Query
  `staleTime` to five minutes.
- **Rationale**: A cold load costs 46 Refersion requests; repeat loads within five minutes then
  cost none while still refreshing in the background after the window. `cacheComponents` is
  already enabled, so this uses the project's native caching model with no new dependency.
- **Alternatives considered**: A hand-rolled module-level TTL map — reinvents the platform
  cache; caching individual HTTP responses — fragments the data and still recomputes ranking.

## Error handling

- **Decision**: Define one `UpstreamError` (message plus optional HTTP status). The route maps
  it to `502 { "error": "Unable to load leaderboard." }`; configuration failures map to `500`
  with the same generic body. Details are logged with `console.error` only on the server. The
  client shows a short message and a Retry button that calls `refetch()`.
- **Rationale**: Satisfies the challenge's "handle API responses and errors appropriately"
  without leaking secrets or stack traces. One error type is enough for this scope.
- **Alternatives considered**: Per-affiliate partial failures — would silently hide eligible
  affiliates, contradicting the spec. Automatic retry/backoff inside the server module — more
  code than the scope justifies; a user-triggered retry is the fallback.

## Rate limiting

- **Decision**: Do not implement automated backoff. A `429` surfaces as an upstream error and
  the user can retry.
- **Rationale**: The live account uses 45 of 300 permitted reads. Backoff logic would be unused
  code under the constitution's scope rule.
- **Shortcut**: accounts large enough to exhaust 300 reads/minute fail with an error;
  upgrade to throttling with `Retry-After` if larger accounts must be supported.

## Testing

- **Decision**: Pure functions in `lib/leaderboard.ts` are tested with `node:test` (Node 24 runs
  TypeScript directly). Add `"test": "node --test lib/*.test.ts"` to `package.json`. No test
  framework dependency.
- **Rationale**: Covers pagination stop behavior indirectly through ranking/filtering logic,
  eligibility edge cases, ties, and top-five slicing with zero dependencies.
- **Alternatives considered**: Vitest/Jest — unnecessary installation and config for a handful
  of pure-function checks.

## UI state handling

- **Decision**: Render the table only when `data` is defined and non-empty. `isPending`
  renders five skeleton rows; `error` renders a message plus Retry; an empty array renders an
  explicit empty message. The table has a `<caption>`, `<thead>`, and `scope="col"` headers,
  wrapped in an `overflow-x-auto` container for small screens.
- **Rationale**: Directly encodes the spec's four states; no animation or component library.
- **Alternatives considered**: Suspense boundaries with `useSuspenseQuery` — more moving parts
  for a single view.
