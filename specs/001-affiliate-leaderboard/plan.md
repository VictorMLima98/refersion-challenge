# Implementation Plan: Affiliate Leaderboard

**Branch**: `001-affiliate-leaderboard` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-affiliate-leaderboard/spec.md`

## Summary

Build a single-page leaderboard that retrieves every affiliate from the Refersion API, reads
each affiliate's custom fields, keeps only those whose "Display in leaderboard" field is exactly
`"TRUE"`, ranks them by lifetime total commission, and renders the top five in an accessible
table. A Next.js Route Handler owns all Refersion calls and credentials; a Client Component
uses TanStack Query against that handler to render loading, empty, success, and error states.
TailwindCSS provides a small, responsive UI.

## Technical Context

**Language/Version**: TypeScript 5 (strict), Node.js 24.21, React 19.3.0, Next.js 16.4.4

**Primary Dependencies**: Next.js App Router, React, TailwindCSS v4 (already installed),
TanStack Query v5 (new), `server-only` (new)

**Storage**: N/A — no database; an in-memory Next.js cache holds the result for 5 minutes

**Testing**: `node:test` with `node:assert/strict` for pure leaderboard logic; live-account and
simulated-failure checks per quickstart

**Target Platform**: Node.js server (local or Vercel)

**Project Type**: Web application (single Next.js project)

**Performance Goals**: Leaderboard visible within ~5 seconds for the current 44-affiliate
account; custom-field reads bounded to 8 concurrent requests

**Constraints**: Refersion read limit is 300 requests/minute per account; credentials never
reach the browser; pagination must always terminate

**Scale/Scope**: 44 affiliates / 1 page currently; hard guard at 50 pages × 100 records; one
page, one route handler, three UI states

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Scope Discipline**: PASS — one route, one client view, one pure logic module, one test
  file. TanStack Query and `server-only` are the only additions; both are required by the
  constitution (TanStack) or prevent a credential leak (`server-only`).
- **II. Server-First Next.js**: PASS — the page is a Server Component shell; only the
  leaderboard view is `"use client"`. Credentials and Refersion calls live in a server-only
  module used by `app/api/leaderboard/route.ts`.
- **III. Resilient API Integration**: PASS — pagination starts at page 1 and stops when fewer
  than `limit` records return, with a 50-page guard. Non-2xx and malformed payloads raise typed
  errors. The client renders distinct pending, error, empty, and success states; error includes
  retry.
- **IV. Type Safety at the Boundary**: PASS — narrow runtime guards for the consumed fields,
  no `any`, numbers coerced defensively.
- **V. Minimal, Accessible UI**: PASS — semantic table with caption and column headers,
  responsive Tailwind layout, no UI library.

**Post-design re-check**: PASS — no new principles are implicated by the Phase 1 artifacts.

## Project Structure

### Documentation (this feature)

```text
specs/001-affiliate-leaderboard/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── leaderboard-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created here)
```

### Source Code (repository root)

```text
app/
├── api/leaderboard/route.ts   # Thin GET handler; maps typed errors to JSON
├── layout.tsx                 # Existing; wraps children in QueryClientProvider
├── page.tsx                   # Server page: heading + <Leaderboard />
├── providers.tsx              # "use client" QueryClientProvider (per Next.js guide)
└── globals.css                # Existing Tailwind import

components/
└── leaderboard.tsx            # "use client"; useQuery + pending/error/empty/table

lib/
├── leaderboard.ts             # Pure: isEligible, rankTop, toEntries
├── leaderboard.test.ts        # node:test checks for eligibility, sorting, top five
├── refersion.ts               # "server-only"; token, pagination, custom fields, guards
└── types.ts                   # Shared API payload/domain types

.env.example                   # Variable names only
```

**Structure Decision**: Single Next.js project. Server integration and pure domain logic are
separated so the domain can be tested without network access, per the constitution's quality
gate. No additional layers, repositories, or abstractions.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. No complexity exceptions requested.
