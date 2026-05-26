"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { RoomCard } from "@/components/RoomCard";
import { GlobalLeaderboard } from "@/components/GlobalLeaderboard";
import { CreateRoomModal } from "@/components/CreateRoomModal";
import { UsernamePrompt } from "@/components/UsernamePrompt";
import { useRooms } from "@/lib/hooks/useGame";
import { useWallet } from "@/lib/genlayer/wallet";
import { useSession } from "@/lib/auth/SessionProvider";

export default function LobbyPage() {
  const router = useRouter();
  const { address } = useWallet();
  const { data: rooms, isLoading } = useRooms();
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"rooms" | "leaderboard">("rooms");
  const { needsUsername, saveUsername } = useSession();

  const activeRooms = rooms?.filter((r) => !r.is_complete) || [];
  const completedRooms = rooms?.filter((r) => r.is_complete) || [];

  const handleJoin = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-8 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-[1280px] mx-auto">
          {/* Hero */}
          <section className="text-center mb-12 animate-fade-in">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-3">
              <span className="text-gradient">PicGuess</span>
            </h1>
            <p className="text-on-surface-variant text-lg md:text-xl max-w-xl mx-auto mb-6">
              Guess the image. Earn XP. AI judges your guesses on-chain.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              disabled={!address}
              className="btn-gradient text-white text-base font-bold px-8 py-3 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.5)] disabled:opacity-50 hover:scale-105 transition-transform"
            >
              + Create Room
            </button>
            {!address && (
              <p className="text-xs text-outline mt-2">
                Connect your wallet to create a room
              </p>
            )}
          </section>

          {/* Tab Bar */}
          <div className="flex gap-4 mb-6 border-b border-white/10 pb-0.5">
            <button
              onClick={() => setTab("rooms")}
              className={`pb-2 text-sm font-bold transition-colors border-b-2 ${
                tab === "rooms"
                  ? "text-primary border-primary"
                  : "text-on-surface-variant border-transparent hover:text-on-surface"
              }`}
            >
              Active Rooms
            </button>
            <button
              onClick={() => setTab("leaderboard")}
              className={`pb-2 text-sm font-bold transition-colors border-b-2 ${
                tab === "leaderboard"
                  ? "text-primary border-primary"
                  : "text-on-surface-variant border-transparent hover:text-on-surface"
              }`}
            >
              🏅 Leaderboard
            </button>
          </div>

          {/* Rooms Grid */}
          {tab === "rooms" && (
            <div className="animate-fade-in">
              {isLoading && (
                <div className="glass-panel rounded-xl p-12 text-center text-on-surface-variant">
                  Loading rooms...
                </div>
              )}

              {!isLoading && activeRooms.length === 0 && completedRooms.length === 0 && (
                <div className="glass-panel rounded-xl p-12 text-center">
                  <div className="text-5xl mb-4">🎮</div>
                  <h3 className="font-display text-xl font-bold text-on-surface mb-2">
                    No Rooms Yet
                  </h3>
                  <p className="text-sm text-on-surface-variant mb-6">
                    Be the first to create a guessing room!
                  </p>
                  <button
                    onClick={() => setShowCreate(true)}
                    disabled={!address}
                    className="btn-gradient text-white font-bold px-6 py-3 rounded-lg disabled:opacity-50"
                  >
                    + Create Room
                  </button>
                </div>
              )}

              {activeRooms.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">
                    Active ({activeRooms.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeRooms.map((room) => (
                      <RoomCard key={room.id} room={room} onJoin={handleJoin} />
                    ))}
                  </div>
                </div>
              )}

              {completedRooms.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant mb-4">
                    Completed ({completedRooms.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedRooms.map((room) => (
                      <RoomCard key={room.id} room={room} onJoin={handleJoin} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard */}
          {tab === "leaderboard" && (
            <div className="animate-fade-in">
              <GlobalLeaderboard />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-3">
        <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-center gap-6 text-xs text-on-surface-variant">
          <a
            href="https://genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Powered by GenLayer
          </a>
          <a
            href="https://studio.genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Studio
          </a>
          <a
            href="https://docs.genlayer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            Docs
          </a>
        </div>
      </footer>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {/* Username Prompt for new users */}
      <UsernamePrompt
        isOpen={needsUsername}
        onSave={saveUsername}
      />
    </div>
  );
}
