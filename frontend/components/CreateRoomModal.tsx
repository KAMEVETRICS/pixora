"use client";

import { useState } from "react";
import { useCreateRoom } from "@/lib/hooks/useGame";
import { getRandomImageUrls, IMAGE_CATEGORIES, getDisplayUrl } from "@/lib/utils/unsplash";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (roomId: string) => void;
}

export function CreateRoomModal({ isOpen, onClose, onCreated }: CreateRoomModalProps) {
  const { createRoom, isCreating } = useCreateRoom();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [totalRounds, setTotalRounds] = useState(5);
  const [teamMode, setTeamMode] = useState(false);
  const [numTeams, setNumTeams] = useState(2);
  const [images, setImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const handleAutoFill = async (category?: string) => {
    setLoadingImages(true);
    try {
      const urls = await getRandomImageUrls(totalRounds, category);
      setImages(urls);
    } catch (e) {
      console.error("Failed to fetch images:", e);
    }
    setLoadingImages(false);
  };

  const handleRemoveImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = () => {
    createRoom(
      {
        name,
        maxPlayers,
        numTeams: teamMode ? numTeams : 0,
        totalRounds,
        imageUrls: images,
      },
      {
        onSuccess: () => {
          setStep(3);
        },
      }
    );
  };

  const resetAndClose = () => {
    setStep(1);
    setName("");
    setMaxPlayers(10);
    setTotalRounds(5);
    setTeamMode(false);
    setNumTeams(2);
    setImages([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={resetAndClose} />

      {/* Modal */}
      <div className="relative glass-panel rounded-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto border border-primary/20 shadow-[0_0_30px_rgba(160,120,255,0.15)]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h2 className="font-display text-xl font-bold text-on-surface">
            Create Room
          </h2>
          <button onClick={resetAndClose} className="text-on-surface-variant hover:text-on-surface text-xl">
            ✕
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex justify-center gap-2 py-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-surface-high"
              }`}
            />
          ))}
        </div>

        <div className="p-6">
          {/* Step 1: Settings */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Friday Night Guessing"
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    Max Players
                  </label>
                  <span className="text-sm font-mono text-secondary">{maxPlayers}</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={20}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                  Total Rounds
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(Math.max(1, Math.min(20, Number(e.target.value))))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                />
              </div>

              <div className="glass-panel rounded-lg p-4 flex justify-between items-center">
                <div>
                  <span className="text-sm text-on-surface font-semibold">Team Mode</span>
                  <span className="text-xs text-on-surface-variant block mt-0.5">
                    {teamMode ? "Teams" : "Free For All"}
                  </span>
                </div>
                <button
                  onClick={() => setTeamMode(!teamMode)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    teamMode ? "bg-primary" : "bg-surface-high"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      teamMode ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {teamMode && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-2">
                    Number of Teams
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={numTeams}
                    onChange={(e) => setNumTeams(Math.max(2, Math.min(10, Number(e.target.value))))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                  />
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="w-full btn-gradient text-white font-bold py-4 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Next: Choose Images →
              </button>
            </div>
          )}

          {/* Step 2: Image Selection */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-on-surface-variant">
                Choose <strong>{totalRounds}</strong> images for your game. Select a category or auto-fill.
              </p>

              {/* Category pills */}
              <div className="flex flex-wrap gap-2">
                {IMAGE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => handleAutoFill(cat.query)}
                    className="glass-panel px-3 py-1.5 rounded-full text-xs text-on-surface hover:bg-white/10 transition-colors"
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleAutoFill()}
                disabled={loadingImages}
                className="glass-panel w-full py-2.5 rounded-lg text-sm text-secondary hover:bg-white/5 transition-colors border border-secondary/20"
              >
                {loadingImages ? "Loading..." : "✨ Auto-fill all rounds"}
              </button>

              {/* Image grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Array.from({ length: totalRounds }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`aspect-square rounded-lg overflow-hidden ${
                      images[idx]
                        ? "relative group"
                        : "border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-on-surface-variant"
                    }`}
                  >
                    {images[idx] ? (
                      <>
                        <img
                          src={getDisplayUrl(images[idx], 300)}
                          alt={`Round ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-2">
                          <button
                            onClick={() => handleRemoveImage(idx)}
                            className="self-end w-6 h-6 rounded-full bg-black/60 text-white text-xs hover:bg-red-500 transition-colors flex items-center justify-center"
                          >
                            ✕
                          </button>
                          <span className="text-xs text-white font-bold">
                            Round {idx + 1}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl mb-1">+</span>
                        <span className="text-xs">Round {idx + 1}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-on-surface-variant">
                  {images.length} of {totalRounds} images selected
                </span>
                <div className="w-32 h-1.5 bg-surface-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-secondary to-primary rounded-full transition-all"
                    style={{ width: `${(images.length / totalRounds) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 glass-panel text-on-surface-variant font-semibold py-3 rounded-lg hover:bg-white/5"
                >
                  ← Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={images.length < totalRounds || isCreating}
                  className="flex-1 btn-gradient text-white font-bold py-3 rounded-lg disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Room"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-4xl">✓</span>
              </div>
              <div className="text-center">
                <h3 className="font-display text-2xl font-bold text-on-surface mb-2">
                  Room Created!
                </h3>
                <p className="text-sm text-on-surface-variant">
                  Your high-stakes guessing arena is ready.
                </p>
              </div>
              <div className="glass-panel rounded-xl p-6 w-full text-center">
                <h4 className="font-display text-xl font-bold text-on-surface mb-3">
                  {name}
                </h4>
                <div className="flex justify-center gap-6 text-sm text-on-surface-variant">
                  <div>
                    <div className="font-bold text-secondary">{maxPlayers} MAX</div>
                    <div className="text-xs uppercase">Players</div>
                  </div>
                  <div>
                    <div className="font-bold text-tertiary">{totalRounds} RNDS</div>
                    <div className="text-xs uppercase">Rounds</div>
                  </div>
                </div>
              </div>
              <button
                onClick={resetAndClose}
                className="w-full btn-gradient text-white font-bold py-4 rounded-xl"
              >
                Go to Lobby →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
