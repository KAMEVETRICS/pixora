"use client";

import { useState } from "react";

interface UsernamePromptProps {
  isOpen: boolean;
  onSave: (username: string) => void;
}

export function UsernamePrompt({ isOpen, onSave }: UsernamePromptProps) {
  const [username, setUsername] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    if (username.trim()) {
      onSave(username.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative glass-panel rounded-xl w-full max-w-sm mx-4 border border-primary/20 shadow-[0_0_30px_rgba(160,120,255,0.15)]">
        <div className="p-6 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-3xl">👤</span>
          </div>

          <div className="text-center">
            <h2 className="font-display text-xl font-bold text-on-surface mb-1">
              Welcome!
            </h2>
            <p className="text-sm text-on-surface-variant">
              Choose a display name for the leaderboard
            </p>
          </div>

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.slice(0, 20))}
            placeholder="Enter your username"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-on-surface text-center focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />

          <div className="flex justify-between items-center w-full text-xs text-on-surface-variant">
            <span>{username.length}/20</span>
          </div>

          <button
            onClick={handleSave}
            disabled={!username.trim()}
            className="w-full btn-gradient text-white font-bold py-3 rounded-lg disabled:opacity-50"
          >
            Save Username
          </button>
        </div>
      </div>
    </div>
  );
}
