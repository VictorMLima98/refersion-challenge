# Contract: Leaderboard API

The application exposes one internal endpoint consumed by its own client. It never proxies
arbitrary Refersion paths and never exposes upstream headers or credentials.

## `GET /api/leaderboard`

Returns the top five eligible affiliates, already filtered and ranked.

### Success — `200 OK`

Headers:

```http
Content-Type: application/json
Cache-Control: no-store
```

Body:

```json
{
  "entries": [
    {
      "rank": 1,
      "affiliateId": 8572722,
      "name": "Lily Kertzmann",
      "commissionCents": 702513
    },
    {
      "rank": 2,
      "affiliateId": 8572717,
      "name": "Clark Rolfson",
      "commissionCents": 574870
    }
  ]
}
```

Notes:

- `entries` may be `[]`; it is never `null`.
- At most five entries; ordering is described in `data-model.md`.
- `commissionCents` is the raw integer from `performance.total.commission`.

### Upstream failure — `502 Bad Gateway`

Returned when authentication, affiliate listing, custom-field retrieval, or payload validation
fails.

```json
{ "error": "Unable to load leaderboard." }
```

### Configuration failure — `500 Internal Server Error`

Returned when required environment variables are missing.

```json
{ "error": "Unable to load leaderboard." }
```

### Guarantees

- No response includes tokens, the client secret, upstream error text, or stack traces.
- Unknown methods are not implemented; Next.js responds with `405 Method Not Allowed`.
- The endpoint accepts no parameters and does no filtering supplied by the caller.
