import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  fetchLeaderboard,
  resetRefersionTokenCache,
  UpstreamError,
} from "./refersion.ts";

const AUTH_URL = "https://auth.refersion.com/oauth/token";
const API_URL = "https://api.refersion.com/v2026-08";

type FetchCall = {
  url: string;
  signal: AbortSignal | null | undefined;
};

let calls: FetchCall[] = [];
let signalChecks = 0;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function affiliate(id: number, commission: number) {
  return {
    id,
    firstName: `Affiliate ${id}`,
    lastName: null,
    company: null,
    performance: { total: { commission } },
  };
}

function installFetch(
  handler: (url: string, authorization: string | null) => Response,
): void {
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    calls.push({ url, signal: init?.signal });

    if (init?.signal) {
      signalChecks += 1;
    }

    return handler(url, headers.get("Authorization"));
  }) as typeof fetch;
}

beforeEach(() => {
  resetRefersionTokenCache();
  process.env.REFERSION_CLIENT_ID = "test-client-id";
  process.env.REFERSION_CLIENT_SECRET = "test-client-secret";
  calls = [];
  signalChecks = 0;
});

test("paginates until a short page and ranks eligible affiliates", async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) =>
    affiliate(index + 1, (index + 1) * 100),
  );
  const secondPage = [affiliate(101, 10_100), affiliate(102, 10_200)];

  installFetch((url, authorization) => {
    if (url === AUTH_URL) {
      assert.equal(authorization, null);
      return json({ access_token: "token-1", expires_in: 3600 });
    }

    assert.equal(authorization, "Bearer token-1");

    if (url === `${API_URL}/affiliates?page=1&limit=100`) {
      return json({ data: firstPage });
    }

    if (url === `${API_URL}/affiliates?page=2&limit=100`) {
      return json({ data: secondPage });
    }

    if (url.startsWith(`${API_URL}/affiliates/`)) {
      return json({
        data: [{ label: "Display in leaderboard", value: "TRUE" }],
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  });

  const entries = await fetchLeaderboard();
  const listCalls = calls.filter((call) =>
    call.url.startsWith(`${API_URL}/affiliates?`),
  );
  const fieldCalls = calls.filter((call) =>
    call.url.includes("/custom-fields"),
  );

  assert.equal(listCalls.length, 2);
  assert.equal(fieldCalls.length, 102);
  assert.equal(signalChecks, calls.length);
  assert.deepEqual(
    entries.map((entry) => [entry.rank, entry.affiliateId, entry.commissionCents]),
    [
      [1, 102, 10_200],
      [2, 101, 10_100],
      [3, 100, 10_000],
      [4, 99, 9_900],
      [5, 98, 9_800],
    ],
  );
});

test("refreshes the token once after a 401 and retries", async () => {
  let tokenCalls = 0;
  let listCalls = 0;

  installFetch((url, authorization) => {
    if (url === AUTH_URL) {
      tokenCalls += 1;
      return json({ access_token: `token-${tokenCalls}`, expires_in: 3600 });
    }

    listCalls += 1;
    assert.equal(
      authorization,
      listCalls === 1 ? "Bearer token-1" : "Bearer token-2",
    );
    return listCalls === 1
      ? json({ error: "expired" }, 401)
      : json({ data: [] });
  });

  const entries = await fetchLeaderboard();

  assert.equal(entries.length, 0);
  assert.equal(tokenCalls, 2);
  assert.equal(listCalls, 2);
  assert.equal(
    calls.filter((call) => call.url.startsWith(`${API_URL}/affiliates?`))
      .length,
    2,
  );
});

test("rejects a payload without a data array", async () => {
  installFetch((url) =>
    url === AUTH_URL
      ? json({ access_token: "token-1", expires_in: 3600 })
      : json({ nope: [] }),
  );

  await assert.rejects(fetchLeaderboard(), UpstreamError);
});
