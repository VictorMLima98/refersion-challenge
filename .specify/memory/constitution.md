# Refersion Leaderboard Constitution

## Core Principles

### I. Scope Discipline (NON-NEGOTIABLE)

The deliverable is exactly the challenge in `docs/refersion-backend-engineer-challenge.md`:
fetch all affiliates, read each affiliate's custom fields, keep those marked eligible, rank
the top five by lifetime commission, and render them in a table. Nothing else. Do not add
authentication, persistence, a database, global state, background jobs, a design system, or
"future-proof" abstractions. Every dependency, module, and abstraction MUST trace to a stated
requirement; if it cannot, omit it. Prefer deletion over addition and the smallest diff that
fully solves the problem. Rationale: the challenge is time-boxed to 90 minutes and graded on
engineering judgment, correctness, and clarity, not surface area.

### II. Server-First Next.js Architecture

Use the Next.js App Router with React Server Components by default and add `"use client"`
only for components that need browser interactivity. The Refersion client credentials and
all direct Refersion calls MUST stay server-side; the browser MUST only call a local API
route. TypeScript strict mode is required. Keep route handlers thin: they delegate to
server-only modules in `lib/`. Do not introduce a second framework, router, or build tool.

### III. Resilient API Integration

All Refersion requests go to the configured base URL with credentials supplied server-side.
Paginate the List Affiliates endpoint starting at `page=1` with a fixed `limit`, reading
records from `data`, and stop when a page returns fewer records than `limit`; enforce a
maximum-page guard so a malformed response cannot loop forever. Fetch custom fields per
affiliate from `data`, bounding concurrency. Treat non-2xx responses, timeouts, and malformed
payloads as typed errors, never as empty data. The UI MUST expose distinct loading, success,
empty, and error states, and the error state MUST offer a retry. Never expose credentials,
raw upstream errors, or stack traces to the browser.

### IV. Type Safety at the Boundary

API payloads are untrusted input. Declare explicit types for the fields actually consumed and
validate them at the boundary (lightweight guards or schema validation) before use. Do not
use `any`; use `unknown` plus narrow types. Parse numeric values defensively and keep money
values exact in presentation. Eligibility is determined only by a custom field whose label is
exactly `"Display in leaderboard"` and whose value is exactly the string `"TRUE"`.

### V. Minimal, Accessible UI

Style with TailwindCSS and keep the interface to what the challenge needs: a clean, elegant
leaderboard table ranked by `performance.total.commission` descending. Use semantic HTML,
including a `<table>` with `<caption>`, `<thead>`, and `scope` attributes, and ensure keyboard
and screen-reader access plus responsive behavior. Loading, empty, and error states MUST be
visible and understandable. No component library, animation library, or custom design system.

## Technology Constraints

- Next.js (App Router) and React, latest stable compatible versions already in the project.
- TypeScript with `strict` enabled; no implicit `any`.
- TailwindCSS for all styling.
- TanStack Query (v5) for client-side fetching, caching, loading, and error states, pointing
  at a local route handler that owns the Refersion integration.
- `pnpm` for dependency management; do not switch package managers.
- No additional runtime dependency without an explicit, documented justification against
  Principle I.

## Development Workflow & Quality Gates

- Core logic (pagination termination, eligibility filtering, ranking, top-five selection)
  MUST live in pure, dependency-free functions under `lib/` and MUST have a small automated
  test or assert-based self-check.
- `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` MUST pass before delivery.
- The README MUST state how to run the app, the required environment variables, the design
  decisions taken, any unfinished work, and concrete next steps, as required by the challenge.
- Secrets are provided through environment variables and are never committed. A `.env.example`
  documents the required names only.
- Changes that violate a principle are rejected; a deliberate exception MUST be recorded with
  its rationale in the change description.

## Governance

This constitution supersedes other project practices. Amendments require a written proposal
that names the affected principles, the rationale, and any migration or follow-up work; the
amendment takes effect when the constitution file is updated. Versioning follows semantic
versioning: MAJOR for backward-incompatible principle removals or redefinitions, MINOR for new
or materially expanded principles and sections, PATCH for clarifications and wording fixes.
Every change review MUST verify compliance with the principles above, and any added complexity
MUST be justified against Principle I. When guidance conflicts, this document wins; use the
README and `docs/` for runtime guidance rather than duplicating rules here.

**Version**: 1.0.0 | **Ratified**: 2026-11-04 | **Last Amended**: 2026-11-04
