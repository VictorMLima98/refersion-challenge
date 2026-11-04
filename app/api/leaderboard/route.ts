import { connection } from "next/server";

import { getLeaderboard } from "@/lib/leaderboard-cache";
import { UpstreamError } from "@/lib/refersion";

export async function GET() {
  await connection();

  try {
    const entries = await getLeaderboard();

    return Response.json(
      { entries },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Leaderboard request failed", error);

    const status = error instanceof UpstreamError ? 502 : 500;

    return Response.json(
      { error: "Unable to load leaderboard." },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
