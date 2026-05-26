"use client";

import { useState, useEffect } from "react";
import { useCurrentImage, useSubmitGuess, useEvaluateRound } from "@/lib/hooks/useGame";
import { useWallet } from "@/lib/genlayer/wallet";
import type { Room } from "@/lib/contracts/types";

interface GameRoundProps {
  room: Room;
  onEvaluating: () => void;
}

export function GameRound({ room, onEvaluating }: GameRoundProps) {
  const { address } = useWallet();
  const { data: imageUrl } = useCurrentImage(room.id);
  const { submitGuess, isSubmitting } = useSubmitGuess();
  const { evaluateRound, isEvaluating } = useEvaluateRound();

  const [guess, setGuess] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submittedGuess, setSubmittedGuess] = useState("");

  const isHost = address?.toLowerCase() === room.host?.toLowerCase();
  const maxChars = 100;

  // Reset guess state when round changes
  useEffect(() => {
    setGuess("");
    setSubmitted(false);
    setSubmittedGuess("");
  }, [room.current_round]);

  const handleSubmit = () => {
    if (!guess.trim()) return;
    setSubmittedGuess(guess.trim());
    submitGuess(
      { roomId: room.id, guessText: guess.trim() },
      { onSuccess: () => setSubmitted(true) }
    );
  };

  const handleEvaluate = () => {
    onEvaluating();
    evaluateRound(room.id);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Round Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="font-display text-2xl font-bold text-on-surface">
            {room.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <span className="text-sm font-mono text-secondary">Active Round</span>
          </div>
        </div>
        <span className="text-sm font-mono text-outline-variant">
          Round {room.current_round} of {room.total_rounds}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-surface-high rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-secondary to-primary rounded-full transition-all duration-500"
          style={{ width: `${(Number(room.current_round) / Number(room.total_rounds)) * 100}%` }}
        />
      </div>

      {/* Image Canvas */}
      <div className="w-full aspect-video rounded-xl overflow-hidden glass-panel glow-primary relative image-recessed p-2 border border-primary/30">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Guess this image"
            className="w-full h-full object-cover rounded-lg border border-white/5"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
            Loading image...
          </div>
        )}
      </div>

      {/* Guess Input */}
      {!submitted ? (
        <div className="glass-panel rounded-xl p-6 flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <div className="flex justify-between items-center">
            <label className="text-sm font-mono text-on-surface">
              What do you see?
            </label>
            <span className="text-xs font-mono text-outline">
              {guess.length}/{maxChars}
            </span>
          </div>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value.slice(0, maxChars))}
            placeholder="Enter your guess..."
            className="w-full bg-black/30 border border-white/10 rounded-lg p-4 font-mono text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !guess.trim()}
            className="w-full btn-gradient text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(139,92,246,0.4)] flex justify-center items-center gap-2"
          >
            {isSubmitting ? "Submitting..." : "▷ Submit Guess"}
          </button>
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-6 flex flex-col items-center justify-center gap-4 relative overflow-hidden border-secondary/50">
          <div className="flex items-center gap-2 text-secondary bg-secondary/10 px-4 py-2 rounded-full border border-secondary/20">
            <span className="text-sm">✓</span>
            <span className="text-xs font-bold uppercase tracking-wider">
              Guess Submitted
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-on-surface text-center">
            &ldquo;{submittedGuess}&rdquo;
          </h2>
          <p className="text-sm text-outline-variant">
            Waiting for host to evaluate...
          </p>
        </div>
      )}

      {/* Host: Evaluate Button */}
      {isHost && (
        <button
          onClick={handleEvaluate}
          disabled={isEvaluating}
          className="w-full btn-gradient-amber text-white font-bold py-4 rounded-xl transition-all animate-pulse-slow shadow-[0_0_15px_rgba(245,158,11,0.4)] flex justify-center items-center gap-2"
        >
          {isEvaluating ? "AI Evaluating..." : "⚖️ Evaluate Round"}
        </button>
      )}
    </div>
  );
}
