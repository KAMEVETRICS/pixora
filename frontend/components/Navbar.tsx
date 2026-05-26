"use client";

import { useWallet } from "@/lib/genlayer/wallet";

export function Navbar() {
  const { address, connectWallet, disconnectWallet } = useWallet();

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-surface-dim/80 backdrop-blur-xl shadow-[0_0_15px_rgba(208,188,255,0.1)]">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-[1280px] mx-auto">
        <a href="/" className="flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <span className="font-display text-xl font-bold tracking-tighter text-gradient">
            PicGuess
          </span>
        </a>

        <nav className="hidden md:flex gap-6 items-center">
          <a
            href="/"
            className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium"
          >
            Lobby
          </a>
        </nav>

        <div>
          {address ? (
            <button
              onClick={() => disconnectWallet?.()}
              className="glass-panel px-4 py-2 rounded-full text-sm font-mono flex items-center gap-2 hover:bg-white/5 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-on-surface">{truncated}</span>
            </button>
          ) : (
            <button
              onClick={() => connectWallet?.()}
              className="btn-gradient text-white text-sm font-semibold px-5 py-2 rounded-full hover:scale-105 transition-transform"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
