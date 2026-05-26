"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { WaitingRoom } from "@/components/WaitingRoom";
import { GameRound } from "@/components/GameRound";
import { EvaluatingOverlay } from "@/components/EvaluatingOverlay";
import { RoundResults } from "@/components/RoundResults";
import { GameOver } from "@/components/GameOver";
import { RoomLeaderboard } from "@/components/RoomLeaderboard";
import { useRoom, useCurrentImage } from "@/lib/hooks/useGame";

type GameView = "waiting" | "playing" | "evaluating" | "results" | "gameover";

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.id as string;

  const { data: room, isLoading } = useRoom(roomId);
  const { data: currentImage } = useCurrentImage(roomId);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [view, setView] = useState<GameView>("waiting");
  const [resultsRound, setResultsRound] = useState(0);

  // Track the last round we saw, so ALL players (not just host) detect transitions
  const lastSeenRoundRef = useRef<number>(0);
  // Track if the host triggered evaluation (only host sets this)
  const hostEvaluatingRef = useRef<boolean>(false);

  // Derive the view from room state changes
  useEffect(() => {
    if (!room) return;

    const currentRound = Number(room.current_round);

    if (room.is_complete) {
      // Game finished — show results for the last round first, then gameover
      const lastRound = Number(room.total_rounds);
      if (view === "evaluating" || view === "playing") {
        setResultsRound(lastRound);
        lastSeenRoundRef.current = currentRound;
        hostEvaluatingRef.current = false;
        setView("results");
      } else if (view !== "results") {
        setView("gameover");
      }
    } else if (!room.is_active && currentRound === 0) {
      setView("waiting");
    } else if (view === "evaluating" && hostEvaluatingRef.current) {
      // HOST is waiting for their evaluation to complete.
      // When the round advances, evaluation is done.
      if (currentRound > lastSeenRoundRef.current) {
        setResultsRound(lastSeenRoundRef.current);
        lastSeenRoundRef.current = currentRound;
        hostEvaluatingRef.current = false;
        setView("results");
      }
    } else if (view === "playing" && lastSeenRoundRef.current > 0 && currentRound > lastSeenRoundRef.current) {
      // NON-HOST player: round advanced while they were on "playing".
      // Show them results for the round that just finished.
      setResultsRound(lastSeenRoundRef.current);
      lastSeenRoundRef.current = currentRound;
      setView("results");
    } else if (view === "results") {
      // Stay on results until user clicks continue
    } else if (room.is_active && currentRound > 0) {
      // Game is active — ensure we're tracking the round
      if (lastSeenRoundRef.current === 0) {
        lastSeenRoundRef.current = currentRound;
      }
      if (view !== "playing") {
        setView("playing");
      }
    }
  }, [room]);

  const handleEvaluating = useCallback(() => {
    // Only the host calls this — mark that we're evaluating
    hostEvaluatingRef.current = true;
    setView("evaluating");
  }, []);

  const handleContinueFromResults = useCallback(() => {
    if (!room) return;
    if (room.is_complete || resultsRound >= Number(room.total_rounds)) {
      setView("gameover");
    } else {
      setView("playing");
    }
  }, [room, resultsRound]);

  if (isLoading || !room) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="glass-panel rounded-xl p-8 text-on-surface-variant text-center">
            <div className="text-3xl mb-3">🔄</div>
            Loading room...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-6 pb-16 px-4 md:px-6 lg:px-8 flex justify-center">
        {view === "waiting" && <WaitingRoom room={room} />}

        {view === "playing" && (
          <GameRound room={room} onEvaluating={handleEvaluating} />
        )}

        {view === "evaluating" && <EvaluatingOverlay />}

        {view === "results" && (
          <RoundResults
            room={room}
            roundNum={resultsRound}
            imageUrl={currentImage}
            onContinue={handleContinueFromResults}
          />
        )}

        {view === "gameover" && <GameOver room={room} />}
      </main>

      {/* Leaderboard FAB */}
      {view !== "gameover" && view !== "waiting" && (
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className="fixed bottom-6 right-6 z-30 btn-gradient w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-[0_0_20px_rgba(139,92,246,0.5)]"
        >
          🏅
        </button>
      )}

      <RoomLeaderboard
        roomId={roomId}
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
      />
    </div>
  );
}
