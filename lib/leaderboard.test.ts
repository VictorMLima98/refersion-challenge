import assert from "node:assert/strict";
import test from "node:test";

import { formatCommission, isEligible, rankTopFive } from "./leaderboard.ts";
import type { Affiliate, CustomField } from "./types.ts";

function field(label: string, value: string | null): CustomField {
  return { label, value };
}

function affiliate(
  id: number,
  firstName: string | null,
  commission: number | null,
  company: string | null = null,
): Affiliate {
  return {
    id,
    firstName,
    lastName: null,
    company,
    performance:
      commission === null ? null : { total: { commission } },
  };
}

test("eligibility requires the exact label and value", () => {
  assert.equal(isEligible([field("Display in leaderboard", "TRUE")]), true);
  assert.equal(isEligible([field("Display in leaderboard", "true")]), false);
  assert.equal(isEligible([field("Display in leaderboard", "FALSE")]), false);
  assert.equal(isEligible([field("Display in leaderboard", " TRUE")]), false);
  assert.equal(isEligible([field("display in leaderboard", "TRUE")]), false);
  assert.equal(isEligible([field("Other", "TRUE")]), false);
  assert.equal(
    isEligible([
      field("Other", "FALSE"),
      field("Display in leaderboard", "TRUE"),
    ]),
    true,
  );
});

test("ranking is descending, capped at five, and ranked from one", () => {
  const entries = rankTopFive([
    affiliate(1, "Alpha", 100),
    affiliate(2, "Bravo", 500),
    affiliate(3, "Charlie", 300),
    affiliate(4, "Delta", 400),
    affiliate(5, "Echo", 200),
    affiliate(6, "Foxtrot", 600),
  ]);

  assert.deepEqual(
    entries.map((entry) => [entry.rank, entry.name, entry.commissionCents]),
    [
      [1, "Foxtrot", 600],
      [2, "Bravo", 500],
      [3, "Delta", 400],
      [4, "Charlie", 300],
      [5, "Echo", 200],
    ],
  );
});

test("ties are broken by name and then id", () => {
  const entries = rankTopFive([
    affiliate(2, "Zulu", 100),
    affiliate(1, "Alpha", 100),
    affiliate(3, "Alpha", 100),
  ]);

  assert.deepEqual(
    entries.map((entry) => entry.affiliateId),
    [1, 3, 2],
  );
});

test("missing, negative, and non-finite commission becomes zero", () => {
  const entries = rankTopFive([
    affiliate(1, "Missing", null),
    affiliate(2, "Negative", -50),
    affiliate(3, "Infinite", Number.POSITIVE_INFINITY),
    affiliate(4, "Valid", 10),
  ]);

  assert.deepEqual(
    entries.map((entry) => entry.commissionCents),
    [10, 0, 0, 0],
  );
});

test("falls back to company and then id for the display name", () => {
  const entries = rankTopFive([
    affiliate(7, null, 10, "Acme"),
    affiliate(8, null, 5),
  ]);

  assert.deepEqual(
    entries.map((entry) => entry.name),
    ["Acme", "Affiliate 8"],
  );
});

test("formats cents as US dollars", () => {
  assert.equal(formatCommission(702513), "$7,025.13");
  assert.equal(formatCommission(0), "$0.00");
});
