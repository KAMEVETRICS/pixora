"use client";

import { useRoundResults, useDbUsernames } from "@/lib/hooks/useGame";
import type { Room } from "@/lib/contracts/types";

interface RoundResultsProps {
  room: Room;
  roundNum: number;
  imageUrl?: string;
  onContinue: () => void;
}

export function RoundResults({ room, roundNum, imageUrl, onContinue }: RoundResultsProps) {
  const { data: results, isLoading } = useRoundResults(room.id, roundNum);

  const entries = results
    ? Object.entries(results)
        .map(([addr, g]) => ({ address: addr, ...g }))
        .sort((a, b) => Number(b.xp_awarded) - Number(a.xp_awarded))
    : [];

  const { data: dbUsernames = {} } = useDbUsernames(entries.map(e => e.address));

  const xpColor = (xp: number) => {
    if (xp >= 90) return "text-yellow-400 border-yellow-400/30";
    if (xp >= 60) return "text-emerald-400 border-emerald-400/30";
    if (xp >= 30) return "text-secondary border-secondary/30";
    if (xp > 0) return "text-on-surface-variant border-outline-variant/30";
    return "text-red-400 border-red-400/30";
  };

  const isFinalRound = Number(roundNum) >= Number(room.total_rounds);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Image + AI Analysis */}
      {imageUrl && (
        <div className="glass-panel rounded-xl p-4 flex flex-col items-center gap-4">
          <img
            src={imageUrl}
            alt="Round image"
            className="w-48 h-48 object-cover rounded-lg border border-white/10"
          />
          <div className="text-center">
            <h3 className="text-sm font-bold text-secondary flex items-center gap-2 justify-center">
              🤖 AI Analysis Complete
            </h3>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-display text-xl font-bold text-on-surface">
          Round {roundNum} Results
        </h2>
        <span className="text-sm text-on-surface-variant">
          {entries.length} Players
        </span>
      </div>

      {isLoading && (
        <div className="glass-panel rounded-xl p-8 text-center text-on-surface-variant">
          Loading results...
        </div>
      )}

      {/* Per-player results */}
      <div className="space-y-3">
        {entries.map((entry, i) => (
          <div
            key={entry.address}
            className={`glass-panel rounded-xl p-4 border-l-4 ${xpColor(Number(entry.xp_awarded))} animate-fade-in`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {(dbUsernames[entry.address.toLowerCase()] || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-sm font-semibold text-on-surface">
                    {dbUsernames[entry.address.toLowerCase()] || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                  </span>
                  <span className={`ml-2 text-sm font-bold ${xpColor(Number(entry.xp_awarded)).split(" ")[0]}`}>
                    +{Number(entry.xp_awarded)} XP
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-black/20 rounded-lg p-3 mb-2">
              <span className="text-xs text-on-surface-variant block mb-1">Guess</span>
              <span className="text-sm text-on-surface">&ldquo;{entry.guess_text}&rdquo;</span>
            </div>
            {entry.explanation && (
              <p className="text-xs text-on-surface-variant italic">
                {entry.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Next Round / Game Over */}
      <div className="text-center py-4">
        {isFinalRound ? (
          <button
            onClick={onContinue}
            className="btn-gradient text-white font-bold px-8 py-4 rounded-xl text-lg"
          >
            🏆 View Final Results
          </button>
        ) : (
          <button
            onClick={onContinue}
            className="glass-panel text-secondary font-bold px-8 py-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            Next Round →
          </button>
        )}
      </div>
    </div>
  );
}
