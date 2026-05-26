"use client";

export function EvaluatingOverlay() {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center gap-8 py-16">
      {/* Brain icon with pulsing rings */}
      <div className="relative">
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-secondary/40 flex items-center justify-center animate-spin" style={{ animationDuration: "8s" }}>
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center animate-spin" style={{ animationDuration: "4s", animationDirection: "reverse" }}>
            <span className="text-3xl">🧠</span>
          </div>
        </div>
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full border border-secondary/20 animate-ping" style={{ animationDuration: "2s" }} />
      </div>

      <div className="text-center space-y-3">
        <h2 className="font-display text-2xl font-bold text-on-surface">
          AI is analyzing the image...
        </h2>
        <div className="glass-panel inline-block px-6 py-3 rounded-full">
          <p className="text-sm text-on-surface-variant">
            This may take up to 30 seconds
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm h-1.5 bg-surface-high rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
          style={{
            animation: "progressBar 15s ease-in-out infinite",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes progressBar {
          0% { width: 5%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}
