---

description: "Task list for the affiliate leaderboard feature"
---

# Tasks: Affiliate Leaderboard

**Input**: Design documents from `/specs/001-affiliate-leaderboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/leaderboard-api.md

**Tests**: TDD was not requested. The constitution requires an automated check for core logic,
so one `node:test` file covers eligibility, ranking, top-five selection, and formatting. No
other test tasks are generated.

**Organization**: Tasks are grouped by user story. The happy path (US1), loading/error states
(US2), and empty state (US3) all touch `components/leaderboard.tsx`, so those phases are
sequential.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install the two required dependencies and prepare the test/environment plumbing.

- [X] T001 Install runtime dependencies with `pnpm add @tanstack/react-query server-only`; confirm both appear in `package.json`.
- [X] T002 [P] Add `"test": "node --test lib/*.test.ts"` to the scripts in `package.json`.
- [X] T003 [P] Add `"allowImportingTsExtensions": true` to `compilerOptions` in `tsconfig.json` so Node's TypeScript test file can import `./leaderboard.ts`; `noEmit` is already enabled.
- [X] T004 [P] Create `.env.example` containing only `REFERSION_CLIENT_ID=` and `REFERSION_CLIENT_SECRET=`, and verify `.gitignore` already excludes `.env*` (add it if missing).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, server integration, API route, and query provider that every story
depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 [P] Create `lib/types.ts` with `LeaderboardEntry` (`rank`, `affiliateId`, `name`, `commissionCents`) and `LeaderboardResponse` (`entries`) exactly as defined in `data-model.md`; `entries` is never `null`.
- [X] T006 [P] Create `lib/leaderboard.test.ts` using `node:test` and `node:assert/strict`. Cover: exact eligibility (`label === "Display in leaderboard"`, `value === "TRUE"`, rejecting `"false"`, `"true"`, and padded values); missing/`NaN`/negative commission becomes `0`; descending sort with tie-break by name then id; result limited to five; ranks contiguous from 1; `$7,025.13` formatting from `702513` cents.
- [X] T007 Create `lib/leaderboard.ts` with pure functions `isEligible(fields)`, `commissionCents(affiliate)`, `rankTopFive(affiliates)`, `formatCommission(cents)`. Rules: at most five entries, ranks start at 1, sort by `commissionCents` descending then `name` ascending then `affiliateId` ascending, and never emit negative commission.
- [X] T008 Create `lib/refersion.ts` with `import "server-only"`. Implement: read `REFERSION_CLIENT_ID`/`REFERSION_CLIENT_SECRET` and throw a configuration error if missing; exchange credentials at `https://auth.refersion.com/oauth/token` for a short-lived token and cache it in module memory until `expires_in - 60`; `Authorization: Bearer` on every call; `GET {base}/affiliates?page=N&limit=100` starting at page 1 and stopping when `data.length < 100`, with a 50-page guard; `GET {base}/affiliates/{id}/custom-fields` for each affiliate with at most 8 in flight; validate that every response has a `data` array; throw one `UpstreamError` for non-2xx, timeouts, or malformed payloads; use `fetch(..., { cache: "no-store" })`; log details with `console.error` only on the server.
- [X] T009 Create `app/api/leaderboard/route.ts` exporting only `GET`. It calls the server module, returns `Response.json({ entries })` with `Cache-Control: no-store`, maps `UpstreamError` to `502` and configuration errors to `500`, and always uses the generic body `{ "error": "Unable to load leaderboard." }` per `contracts/leaderboard-api.md`. Do not add `dynamic = "force-dynamic"` (Cache Components is enabled).
- [X] T010 Create `app/providers.tsx` as a `"use client"` component wrapping children in `QueryClientProvider`, using a module-level browser `QueryClient` and a fresh client on the server, following the Next.js 16 TanStack Query guide.
- [X] T011 Update `app/layout.tsx` to wrap `{children}` with `<Providers>` while keeping the existing fonts, metadata shape, and `lang="en"`.

**Checkpoint**: Foundation ready — the route works with curl and the client can use TanStack Query.

---

## Phase 3: User Story 1 - View the top five affiliates (Priority: P1) 🎯 MVP

**Goal**: A visitor sees the five eligible affiliates with the highest lifetime commission,
ranked highest to lowest, in a table.

**Independent Test**: Load the page with the challenge credentials; exactly five rows appear in
descending commission order and every row belongs to an affiliate whose custom field is exactly
`"TRUE"`.

### Implementation for User Story 1

- [X] T012 [US1] Create `components/leaderboard.tsx` as a `"use client"` component using `useQuery({ queryKey: ["leaderboard"], queryFn, staleTime: 30_000, retry: 1 })` to fetch `/api/leaderboard`. Render a semantic `<table>` with `<caption>`, `<thead>`, `scope="col"` headers (Rank, Affiliate, Lifetime commission), one row per entry, and `formatCommission` for the amount; wrap it in an `overflow-x-auto` container and use restrained Tailwind styling.
- [X] T013 [US1] Replace the default content of `app/page.tsx` with a server component that renders the page heading and `<Leaderboard />` inside a centered, responsive layout; update `app/layout.tsx` metadata to name the leaderboard (no default Create Next App copy remains).

**Checkpoint**: US1 works end-to-end. This alone satisfies the challenge deliverable.

---

## Phase 4: User Story 2 - Understand loading and failures (Priority: P2)

**Goal**: The visitor sees progress while data loads and a clear, recoverable message on
failure.

**Independent Test**: Throttle the network to see the loading state; use an invalid secret to
see the error state, then restore it and press Retry to recover without a page reload.

### Implementation for User Story 2

- [X] T014 [US2] In `components/leaderboard.tsx`, add the `isPending` branch with five skeleton rows using `animate-pulse` (no new dependency) and the `error` branch with a short message and a Retry button calling `refetch()`. Do not render partial table data when `error` is set. Keep the success branch unchanged.

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - See an honest empty state (Priority: P3)

**Goal**: The visitor is told when no affiliate qualifies instead of seeing an empty table.

**Independent Test**: Force the eligibility label to a non-existent value locally; the page
shows an explicit empty message and no table.

### Implementation for User Story 3

- [X] T015 [US3] In `components/leaderboard.tsx`, add an empty branch when `data.entries.length === 0` that renders an explicit "No eligible affiliates" message and no ranking table. Ensure the success, pending, and error branches are unaffected.

**Checkpoint**: All three stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and delivery gates required by the challenge and constitution.

- [X] T016 [P] Update `README.md` with: purpose, setup (`pnpm install`, env vars from `.env.example`, `pnpm dev`), commands, design decisions (server proxy, pagination, eligibility, cents-to-USD), unfinished work, and next steps.
- [X] T017 Run `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build`; fix every failure without weakening the checks. Confirm `.env.local` is not tracked by git.
- [X] T018 Run the live validation scenarios in `specs/001-affiliate-leaderboard/quickstart.md` (happy path, pagination stop, loading, error/retry, empty, accessibility at 375 px) and record any deviation or unfinished work in `README.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1; BLOCKS all user stories.
- **US1 (Phase 3)**: Depends on Phase 2.
- **US2 (Phase 4)**: Depends on Phase 2 and edits the same component as US1 — run after US1.
- **US3 (Phase 5)**: Depends on US1 and US2 — same component file.
- **Polish (Phase 6)**: Depends on all selected stories.

### Within Each Phase

- T006 (tests) must be written and fail before T007 (implementation), per the constitution's
  quality gate.
- T007 and T008 can be developed in parallel after T005, but T009 depends on T008.
- UI phases are sequential because they touch `components/leaderboard.tsx`.

### Parallel Opportunities

- Phase 1: T002, T003, T004 touch separate files and can run together after T001.
- Phase 2: T005, T006 can run in parallel; T007 uses T005. T008 is independent of T005–T007
  and can run concurrently. T010 is independent of T008/T009.
- Phase 6: T016 can run while T017 executes.

---

## Parallel Example: Phase 1 and Phase 2

```bash
# After T001 installs dependencies:
Task: "T002 add test script to package.json"
Task: "T003 add allowImportingTsExtensions to tsconfig.json"
Task: "T004 create .env.example"

# Foundational types and server client:
Task: "T005 create lib/types.ts"
Task: "T006 write lib/leaderboard.test.ts"
Task: "T008 create lib/refersion.ts"
Task: "T010 create app/providers.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (setup).
2. Complete Phase 2 (foundation).
3. Complete Phase 3 (table and page).
4. **STOP and VALIDATE** against the live account: five eligible rows, descending order.

### Incremental Delivery

1. Setup + Foundation → API route verified with curl.
2. Add US1 → validate and demo the leaderboard.
3. Add US2 → validate loading, error, and retry.
4. Add US3 → validate the empty state.
5. Polish → README, gates, live quickstart.

---

## Notes

- `[P]` marks different files with no incomplete dependency.
- Every task names its exact file.
- US1 is the shippable challenge deliverable; US2 and US3 are quality states required by the
  constitution and spec.
- Commit after each logical group; do not commit `.env.local`.
