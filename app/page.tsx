import { Leaderboard } from "@/components/leaderboard";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6 lg:py-20">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-600">
          Refersion
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Top affiliates
        </h1>
        <p className="max-w-2xl text-base text-zinc-600">
          The five eligible affiliates with the highest lifetime commission.
        </p>
      </header>
      <Leaderboard />
    </main>
  );
}
