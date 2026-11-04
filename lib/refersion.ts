import { isEligible, rankTopFive } from "./leaderboard.ts";
import type { Affiliate, CustomField, LeaderboardEntry } from "./types.ts";

const AUTH_URL = "https://auth.refersion.com/oauth/token";
const API_BASE = "https://api.refersion.com/v2026-08";
const PAGE_SIZE = 100;
const MAX_PAGES = 50;
const CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 10_000;

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

class UnauthorizedError extends UpstreamError {
  constructor() {
    super("Refersion rejected the access token");
    this.name = "UnauthorizedError";
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;
let pendingToken: Promise<string> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readData(payload: unknown): unknown[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new UpstreamError("Refersion response is missing a data array");
  }

  return payload.data;
}

async function postForm(url: string, body: URLSearchParams): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new UpstreamError(`Authentication request failed: ${String(error)}`);
  }

  if (!response.ok) {
    throw new UpstreamError(`Authentication failed with status ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    throw new UpstreamError("Authentication response was not valid JSON");
  }
}

async function requestToken(): Promise<string> {
  const clientId = process.env.REFERSION_CLIENT_ID;
  const clientSecret = process.env.REFERSION_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing REFERSION_CLIENT_ID or REFERSION_CLIENT_SECRET",
    );
  }

  const payload = await postForm(
    AUTH_URL,
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      token_type: "short_lived",
    }),
  );

  const token = isRecord(payload) ? asString(payload.access_token) : null;
  const expiresIn = isRecord(payload) ? asNumber(payload.expires_in) : null;

  if (!token || expiresIn === null) {
    throw new UpstreamError("Authentication response is missing token fields");
  }

  cachedToken = {
    value: token,
    expiresAt: Date.now() + Math.max(expiresIn - 60, 0) * 1000,
  };

  return token;
}

function getToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return Promise.resolve(cachedToken.value);
  }

  pendingToken ??= requestToken().finally(() => {
    pendingToken = null;
  });

  return pendingToken;
}

async function getJson(path: string, token: string): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new UpstreamError(`Refersion request failed: ${String(error)}`);
  }

  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    throw new UpstreamError(
      `Refersion request failed with status ${response.status}`,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new UpstreamError("Refersion response was not valid JSON");
  }
}

async function getAuthorizedJson(path: string): Promise<unknown> {
  const token = await getToken();

  try {
    return await getJson(path, token);
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) {
      throw error;
    }

    // Another token request can revoke the cached one; refresh once and retry.
    return getJson(path, await getToken(true));
  }
}

function parseAffiliate(value: unknown): Affiliate {
  if (!isRecord(value)) {
    throw new UpstreamError("Refersion affiliate record is malformed");
  }

  const id = asNumber(value.id);

  if (id === null) {
    throw new UpstreamError("Refersion affiliate record is missing a valid id");
  }

  const performance = isRecord(value.performance) ? value.performance : null;
  const total = performance && isRecord(performance.total) ? performance.total : null;

  return {
    id,
    firstName: asString(value.firstName),
    lastName: asString(value.lastName),
    company: asString(value.company),
    performance: total ? { total: { commission: asNumber(total.commission) ?? 0 } } : null,
  };
}

function parseCustomField(value: unknown): CustomField | null {
  if (!isRecord(value)) {
    return null;
  }

  const label = asString(value.label);

  if (!label) {
    return null;
  }

  return { label, value: asString(value.value) };
}

async function fetchAffiliates(): Promise<Affiliate[]> {
  const affiliates: Affiliate[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await getAuthorizedJson(
      `/affiliates?page=${page}&limit=${PAGE_SIZE}`,
    );
    const records = readData(payload);

    affiliates.push(...records.map(parseAffiliate));

    if (records.length < PAGE_SIZE) {
      return affiliates;
    }
  }

  throw new UpstreamError(
    `Affiliate pagination exceeded the ${MAX_PAGES}-page limit`,
  );
}

async function fetchCustomFields(
  affiliateId: number,
): Promise<CustomField[]> {
  const payload = await getAuthorizedJson(
    `/affiliates/${affiliateId}/custom-fields`,
  );

  return readData(payload)
    .map(parseCustomField)
    .filter((field): field is CustomField => field !== null);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await task(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

export function resetRefersionTokenCache(): void {
  cachedToken = null;
  pendingToken = null;
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const affiliates = await fetchAffiliates();
  const fieldsByAffiliate = await mapWithConcurrency(
    affiliates,
    CONCURRENCY,
    (affiliate) => fetchCustomFields(affiliate.id),
  );

  const eligible = affiliates.filter((_, index) =>
    isEligible(fieldsByAffiliate[index]),
  );

  return rankTopFive(eligible);
}
