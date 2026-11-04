"use client";

import { useQuery } from "@tanstack/react-query";

import { formatCommission } from "@/lib/leaderboard";
import type { LeaderboardResponse } from "@/lib/types";

async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const response = await fetch("/api/leaderboard");

  if (!response.ok) {
    throw new Error("Unable to load leaderboard.");
  }

  return response.json();
}

function LoadingState() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
    >
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-5 text-sm text-zinc-600">
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-indigo-600"
        />
        Loading leaderboard…
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse border-t border-zinc-100 bg-zinc-50"
        />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-6 text-red-900"
    >
      <p className="text-sm">Unable to load the leaderboard right now.</p>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg bg-red-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900"
      >
        Retry
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <p className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
      No eligible affiliates to display.
    </p>
  );
}

export function Leaderboard() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (isPending) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  if (data.entries.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Top five eligible affiliates by lifetime commission
        </caption>
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Rank
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Affiliate
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Lifetime commission
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {data.entries.map((entry) => (
            <tr key={entry.affiliateId} className="hover:bg-zinc-50">
              <td className="px-4 py-4 font-mono text-zinc-500">
                {entry.rank}
              </td>
              <td className="px-4 py-4 font-medium text-zinc-900">
                {entry.name}
              </td>
              <td className="px-4 py-4 text-right font-mono tabular-nums text-zinc-700">
                {formatCommission(entry.commissionCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
