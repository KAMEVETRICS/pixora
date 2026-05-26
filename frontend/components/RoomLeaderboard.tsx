"use client";

import { useLeaderboard, useDbUsernames } from "@/lib/hooks/useGame";

interface RoomLeaderboardProps {
  roomId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RoomLeaderboard({ roomId, isOpen, onClose }: RoomLeaderboardProps) {
  const { data: leaderboard } = useLeaderboard(roomId);

  const entries = leaderboard
    ? Object.entries(leaderboard)
        .map(([addr, e]) => ({ address: addr, ...e }))
        .sort((a, b) => Number(b.room_xp) - Number(a.room_xp))
    : [];

  const { data: dbUsernames = {} } = useDbUsernames(entries.map(e => e.address));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 z-40 glass-panel border-l border-white/10 shadow-2xl flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-white/10">
        <h3 className="font-display font-bold text-on-surface">
          🏅 Leaderboard
        </h3>
        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {entries.map((entry, i) => (
          <div
            key={entry.address}
            className="flex items-center gap-3 p-3 border-b border-white/5"
          >
            <span className={`w-6 text-center text-xs font-bold ${
              i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-500" : "text-on-surface-variant"
            }`}>
              #{i + 1}
            </span>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              {(dbUsernames[entry.address.toLowerCase()] || entry.username || "?").charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 text-sm text-on-surface truncate">
              {dbUsernames[entry.address.toLowerCase()] || entry.username || `${entry.address.slice(0, 6)}...`}
            </span>
            <span className="text-sm font-mono text-primary">
              {Number(entry.room_xp)}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            No scores yet
          </div>
        )}
      </div>
    </div>
  );
}
