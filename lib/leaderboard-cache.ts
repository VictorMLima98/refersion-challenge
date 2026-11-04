import "server-only";

import { cacheLife } from "next/cache";

import { fetchLeaderboard } from "./refersion.ts";
import type { LeaderboardEntry } from "./types.ts";

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });

  return fetchLeaderboard();
}
