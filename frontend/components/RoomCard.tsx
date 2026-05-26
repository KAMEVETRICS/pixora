"use client";

import type { Room } from "@/lib/contracts/types";

interface RoomCardProps {
  room: Room;
  onJoin: (roomId: string) => void;
}

export function RoomCard({ room, onJoin }: RoomCardProps) {
  const hostTruncated = room.host
    ? `${room.host.slice(0, 4)}...${room.host.slice(-2)}`
    : "Unknown";

  const statusColor = room.is_complete
    ? "bg-gray-500"
    : room.is_active
    ? "bg-emerald-400 animate-pulse"
    : "bg-yellow-400 animate-pulse";

  const statusText = room.is_complete
    ? "Complete"
    : room.is_active
    ? `Round ${room.current_round} of ${room.total_rounds}`
    : "Waiting...";

  const buttonLabel = room.is_complete
    ? "Results"
    : room.is_active
    ? "Watch"
    : "Join";

  return (
    <div className="glass-panel rounded-lg p-4 flex flex-col gap-3 hover:glow-primary transition-all duration-300 group">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold text-on-surface group-hover:text-primary transition-colors">
            {room.name}
          </h3>
          <p className="text-xs font-mono text-on-surface-variant mt-0.5">
            Host: {hostTruncated}
          </p>
        </div>
        {Number(room.num_teams) > 0 && (
          <span className="glass-panel px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider text-tertiary">
            {room.num_teams} Teams
          </span>
        )}
      </div>

      <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-3">
        <div className="flex flex-col">
          <span className="text-sm font-mono text-on-surface">
            {room.player_count}/{room.max_players}{" "}
            <span className="text-on-surface-variant text-xs">Players</span>
          </span>
          <span className="text-xs text-secondary mt-1">{statusText}</span>
        </div>
        <button
          onClick={() => onJoin(room.id)}
          className={`text-sm px-4 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
            room.is_complete
              ? "glass-panel text-on-surface-variant border-transparent"
              : "bg-white/10 hover:bg-white/20 text-on-surface border-white/20"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor} inline-block`} />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
