"use client";

import { useLeaderboard, useTeams, useDbUsernames } from "@/lib/hooks/useGame";
import type { Room } from "@/lib/contracts/types";

interface GameOverProps {
  room: Room;
}

export function GameOver({ room }: GameOverProps) {
  const { data: leaderboard } = useLeaderboard(room.id);
  const { data: teams } = useTeams(room.id);

  const entries = leaderboard
    ? Object.entries(leaderboard)
        .map(([addr, e]) => ({ address: addr, ...e }))
        .sort((a, b) => Number(b.room_xp) - Number(a.room_xp))
    : [];

  const { data: dbUsernames = {} } = useDbUsernames(entries.map(e => e.address));

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd for visual layout
  const podiumHeights = ["h-28", "h-36", "h-24"];
  const podiumColors = [
    "from-gray-300/30 border-gray-300/50",
    "from-yellow-500/30 border-yellow-500/50",
    "from-amber-700/30 border-amber-700/50",
  ];
  const podiumLabels = ["2ND", "1ST", "3RD"];

  const teamEntries = teams
    ? Object.entries(teams)
        .map(([id, t]) => ({ id, ...t }))
        .sort((a, b) => Number(b.total_xp) - Number(a.total_xp))
    : [];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 py-8">
      {/* Trophy Header */}
      <div className="text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="font-display text-3xl font-bold text-on-surface">
          Match Complete!
        </h1>
        <p className="text-sm text-tertiary uppercase tracking-wider mt-1 font-bold">
          {room.name}
        </p>
      </div>

      {/* Podium */}
      {podium.length > 0 && (
        <div className="flex items-end justify-center gap-4">
          {podiumOrder.map((pos, visualIdx) => {
            const entry = podium[pos];
            if (!entry) return <div key={visualIdx} className="w-28" />;
            return (
              <div key={entry.address} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary mb-2 border-2 border-primary/30">
                  {(dbUsernames[entry.address.toLowerCase()] || entry.username || entry.address.slice(2, 4)).charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-on-surface truncate w-24 text-center font-semibold">
                  {dbUsernames[entry.address.toLowerCase()] || entry.username || `${entry.address.slice(0, 6)}...`}
                </span>
                <span className="text-sm font-bold text-tertiary mt-1">
                  {Number(entry.room_xp).toLocaleString()} XP
                </span>
                <div
                  className={`w-24 ${podiumHeights[visualIdx]} mt-2 rounded-t-lg bg-gradient-to-t ${podiumColors[visualIdx]} border border-b-0 flex items-start justify-center pt-2`}
                >
                  <span className="text-xs font-bold tracking-wider text-on-surface/70">
                    {podiumLabels[visualIdx]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Standings */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h3 className="font-display font-bold text-on-surface">Final Standings</h3>
          <span className="text-xs text-on-surface-variant font-mono">
            Room #{room.id}
          </span>
        </div>
        {rest.map((entry, i) => (
          <div
            key={entry.address}
            className="flex items-center gap-3 p-4 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <span className="w-6 text-center text-sm font-mono text-on-surface-variant">
              {i + 4}
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-high flex items-center justify-center text-xs font-bold text-on-surface-variant">
              {(dbUsernames[entry.address.toLowerCase()] || entry.username || "?").charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 text-sm text-on-surface">
              {dbUsernames[entry.address.toLowerCase()] || entry.username || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
            </span>
            <span className="text-sm font-mono text-primary">
              {Number(entry.room_xp).toLocaleString()} XP
            </span>
          </div>
        ))}
      </div>

      {/* Team Standings (if teams enabled) */}
      {Number(room.num_teams) > 0 && teamEntries.length > 0 && (
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-display font-bold text-on-surface">Team Standings</h3>
          </div>
          {teamEntries.map((team, i) => (
            <div
              key={team.id}
              className="flex items-center gap-3 p-4 border-b border-white/5"
            >
              <span className="w-6 text-center text-sm font-bold text-tertiary">
                #{i + 1}
              </span>
              <span className="flex-1 text-sm font-semibold text-on-surface">
                {team.name}
              </span>
              <span className="text-xs text-on-surface-variant mr-3">
                {team.member_count} members
              </span>
              <span className="text-sm font-mono text-tertiary font-bold">
                {Number(team.total_xp).toLocaleString()} XP
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Back to Lobby */}
      <a
        href="/"
        className="w-full btn-gradient text-white font-bold py-4 rounded-xl text-center text-lg block"
      >
        🏠 Back to Lobby
      </a>
    </div>
  );
}
