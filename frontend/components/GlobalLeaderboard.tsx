"use client";

import { useGlobalLeaderboard, useDbUsernames } from "@/lib/hooks/useGame";

export function GlobalLeaderboard() {
  const { data: leaderboard, isLoading } = useGlobalLeaderboard();
  
  const { data: dbUsernames = {} } = useDbUsernames(
    leaderboard ? Object.keys(leaderboard) : []
  );

  const entries = leaderboard
    ? Object.entries(leaderboard)
        .map(([addr, p]) => ({ address: addr, ...p }))
        .sort((a, b) => Number(b.xp) - Number(a.xp))
        .slice(0, 10)
    : [];

  const getDisplayName = (entry: { address: string; username?: string }) => {
    // DB username takes priority, then contract username, then "Unknown"
    const dbName = dbUsernames[entry.address.toLowerCase()];
    if (dbName) return dbName;
    if (entry.username && entry.username !== "Host") return entry.username;
    return entry.username || "Unknown";
  };

  const rankColors = [
    "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
    "bg-gray-300/20 text-gray-300 border-gray-300/50",
    "bg-amber-700/20 text-amber-500 border-amber-700/50",
  ];

  const xpColors = ["text-yellow-400", "text-gray-300", "text-amber-500"];

  return (
    <div className="glass-panel rounded-xl overflow-hidden">
      <div className="grid grid-cols-12 gap-2 p-4 bg-surface-container/50 border-b border-white/10 text-xs uppercase font-bold tracking-wider text-on-surface-variant font-display">
        <div className="col-span-2 text-center">Rank</div>
        <div className="col-span-5">Player</div>
        <div className="col-span-3 text-right">XP</div>
        <div className="col-span-2 text-right">Games</div>
      </div>

      {isLoading && (
        <div className="p-8 text-center text-on-surface-variant text-sm">
          Loading leaderboard...
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <div className="p-8 text-center text-on-surface-variant text-sm">
          No players yet — be the first!
        </div>
      )}

      {entries.map((entry, i) => (
        <div
          key={entry.address}
          className={`grid grid-cols-12 gap-2 p-4 items-center border-b border-white/5 hover:bg-white/5 transition-colors ${
            i < 3
              ? `bg-gradient-to-r ${
                  i === 0
                    ? "from-yellow-500/10"
                    : i === 1
                    ? "from-gray-300/10"
                    : "from-amber-700/10"
                } to-transparent`
              : ""
          }`}
        >
          <div className="col-span-2 flex justify-center">
            {i < 3 ? (
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${rankColors[i]}`}
              >
                {i + 1}
              </span>
            ) : (
              <span className="text-sm text-on-surface-variant font-mono">
                {i + 1}
              </span>
            )}
          </div>
          <div className="col-span-5 truncate">
            <span className="text-sm font-semibold text-on-surface block">
              {getDisplayName(entry)}
            </span>
            <span className="text-xs font-mono text-on-surface-variant">{entry.address.slice(0, 6)}...{entry.address.slice(-4)}</span>
          </div>
          <div
            className={`col-span-3 text-right text-sm font-mono ${
              i < 3 ? xpColors[i] : "text-primary"
            }`}
          >
            {Number(entry.xp).toLocaleString()}
          </div>
          <div className="col-span-2 text-right text-sm font-mono text-on-surface-variant">
            {Number(entry.games_played)}
          </div>
        </div>
      ))}
    </div>
  );
}
