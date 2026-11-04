# Phase 1 Data Model: Affiliate Leaderboard

## Domain types (client-safe, `lib/types.ts`)

### LeaderboardEntry

| Field | Type | Notes |
|-------|------|-------|
| `rank` | `number` | 1–5, assigned after sorting |
| `affiliateId` | `number` | Refersion affiliate id |
| `name` | `string` | Display name derived from first/last/company; never empty |
| `commissionCents` | `number` | Non-negative integer in minor currency units |

Invariants:

- `entries.length <= 5`.
- Ranks are contiguous starting at 1.
- `entries` are sorted by `commissionCents` descending, then `name` ascending, then
  `affiliateId` ascending.

### LeaderboardResponse

| Field | Type | Notes |
|-------|------|-------|
| `entries` | `LeaderboardEntry[]` | May be empty; never `null` |

### Upstream affiliate (subset consumed, `lib/refersion.ts`)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `number` | yes | Missing/non-numeric rejects the record |
| `firstName` | `string \| null` | no | |
| `lastName` | `string \| null` | no | |
| `company` | `string \| null` | no | Used only if both names are absent |
| `performance.total.commission` | `number \| null` | no | Missing becomes 0 |

### Custom field (subset consumed)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `label` | `string` | yes | Compared exactly with `"Display in leaderboard"` |
| `value` | `string \| null` | no | Compared exactly with `"TRUE"` |

## Validation rules

- The affiliate listing response must contain a `data` array; otherwise it is a malformed
  payload and raises `UpstreamError`.
- Each custom-fields response must contain a `data` array; otherwise it is a malformed payload
  and raises `UpstreamError`.
- `performance.total.commission` is coerced with `Number()`; `NaN`, `Infinity`, negatives, and
  missing values become `0`.
- Duplicate custom fields are allowed; any exact label/value match makes the affiliate eligible.
- Affiliate status (`APPROVED`, `DENIED`, etc.) does not affect eligibility.

## State transitions

No persisted state. Per request the server moves through:

`authenticate → list all affiliate pages → fetch custom fields (bounded concurrency) → filter
eligible → sort → take five → respond`

Any failure before the response becomes an error state; the client can re-run the whole flow
with Retry.
