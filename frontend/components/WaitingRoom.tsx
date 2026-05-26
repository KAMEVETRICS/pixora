"use client";

import { useState } from "react";
import { useRoomPlayers, useJoinRoom, useStartGame, useDbUsernames } from "@/lib/hooks/useGame";
import { useWallet } from "@/lib/genlayer/wallet";
import { useSession } from "@/lib/auth/SessionProvider";
import type { Room } from "@/lib/contracts/types";

interface WaitingRoomProps {
  room: Room;
}

export function WaitingRoom({ room }: WaitingRoomProps) {
  const { address } = useWallet();
  const { data: players } = useRoomPlayers(room.id);
  const { joinRoom, isJoining } = useJoinRoom();
  const { startGame, isStarting } = useStartGame();

  const { username: sessionUsername } = useSession();
  const { data: dbUsernames = {} } = useDbUsernames(players ? Object.keys(players) : []);

  const [copied, setCopied] = useState(false);

  const isHost = address?.toLowerCase() === room.host?.toLowerCase();
  const isJoined = players && address ? !!players[address.toLowerCase()] : false;
  const playerCount = players ? Object.keys(players).length : room.player_count;
  const canStart = isHost && Number(playerCount) >= 2;

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/room/${room.id}`
    : "";

  const handleJoin = () => {
    joinRoom({ roomId: room.id, username: sessionUsername || "Player" });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Room Header */}
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-on-surface">{room.name}</h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-400" />
          </span>
          <span className="text-sm font-mono text-tertiary">Waiting for Players</span>
        </div>
      </div>

      {/* Player Count */}
      <div className="glass-panel rounded-xl p-6 text-center">
        <div className="text-5xl font-display font-bold text-gradient mb-2">
          {playerCount}
          <span className="text-on-surface-variant text-2xl">/{room.max_players}</span>
        </div>
        <p className="text-sm text-on-surface-variant">Players joined</p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-surface-high rounded-full overflow-hidden mt-4">
          <div
            className="h-full bg-gradient-to-r from-secondary to-primary rounded-full transition-all duration-500"
            style={{ width: `${(Number(playerCount) / Number(room.max_players)) * 100}%` }}
          />
        </div>
      </div>

      {/* Player List */}
      {players && Object.keys(players).length > 0 && (
        <div className="glass-panel rounded-xl p-4">
          <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Players
          </h3>
          <div className="space-y-2">
            {Object.entries(players).map(([addr, p]) => {
              const isMe = addr.toLowerCase() === address?.toLowerCase();
              const isPlayerHost = addr.toLowerCase() === room.host?.toLowerCase();
              return (
                <div
                  key={addr}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isMe ? "bg-primary/10 border border-primary/20" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {(dbUsernames[addr.toLowerCase()] || p.username || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-on-surface flex-1">
                    {dbUsernames[addr.toLowerCase()] || p.username}
                  </span>
                  {isPlayerHost && (
                    <span className="text-xs text-tertiary">👑 Host</span>
                  )}
                  {isMe && !isPlayerHost && (
                    <span className="text-xs text-secondary">You</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Join Form — only for non-host users who haven't joined yet */}
      {!isHost && !isJoined && address && (
        <div className="glass-panel rounded-xl p-6 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-on-surface">Ready to play?</h3>
            <p className="text-sm text-on-surface-variant">Join as {sessionUsername || "Player"}</p>
          </div>
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="btn-gradient text-white font-semibold px-8 py-3 rounded-lg disabled:opacity-50 transition-all"
          >
            {isJoining ? "Joining..." : "Join Game"}
          </button>
        </div>
      )}

      {/* Host Controls */}
      {isHost && (
        <div className="flex flex-col gap-4">
          {/* Host status badge */}
          <div className="glass-panel rounded-xl p-4 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                👑
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">You are the host</p>
                <p className="text-xs text-on-surface-variant">
                  {canStart
                    ? "Ready to start when you are!"
                    : `Waiting for ${2 - Number(playerCount)} more player${2 - Number(playerCount) !== 1 ? "s" : ""} to join…`}
                </p>
              </div>
            </div>
          </div>

          {/* Start Game button */}
          <button
            onClick={() => startGame(room.id)}
            disabled={isStarting || !canStart}
            className="w-full py-4 rounded-xl text-lg font-bold transition-all disabled:opacity-40 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:brightness-110 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            {isStarting
              ? "Starting..."
              : canStart
              ? "🚀 Start Game"
              : `Need ${2 - Number(playerCount)} more player${2 - Number(playerCount) !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Non-host: joined and waiting */}
      {!isHost && isJoined && (
        <div className="text-center text-on-surface-variant text-sm py-4">
          <div className="inline-flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
            Waiting for host to start the game...
          </div>
        </div>
      )}

      {/* Share Link */}
      <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
        <input
          type="text"
          value={shareUrl}
          readOnly
          className="flex-1 bg-transparent text-sm text-on-surface-variant font-mono truncate border-none outline-none"
        />
        <button
          onClick={handleCopy}
          className="glass-panel px-3 py-1.5 rounded-lg text-xs text-secondary hover:bg-white/5 transition-colors"
        >
          {copied ? "✓ Copied" : "📋 Copy"}
        </button>
      </div>
    </div>
  );
}
