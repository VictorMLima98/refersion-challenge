import type { Affiliate, CustomField, LeaderboardEntry } from "./types";

export const DISPLAY_FIELD_LABEL = "Display in leaderboard";

export function isEligible(fields: CustomField[]): boolean {
  return fields.some(
    (field) =>
      field.label === DISPLAY_FIELD_LABEL && field.value === "TRUE",
  );
}

export function toCommissionCents(affiliate: Affiliate): number {
  const raw = Number(affiliate.performance?.total?.commission);

  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }

  return Math.trunc(raw);
}

export function displayName(affiliate: Affiliate): string {
  const fullName = [affiliate.firstName, affiliate.lastName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();

  return fullName || affiliate.company?.trim() || `Affiliate ${affiliate.id}`;
}

export function rankTopFive(affiliates: Affiliate[]): LeaderboardEntry[] {
  return affiliates
    .map((affiliate) => ({
      affiliateId: affiliate.id,
      name: displayName(affiliate),
      commissionCents: toCommissionCents(affiliate),
    }))
    .sort(
      (a, b) =>
        b.commissionCents - a.commissionCents ||
        a.name.localeCompare(b.name) ||
        a.affiliateId - b.affiliateId,
    )
    .slice(0, 5)
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}

export function formatCommission(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
