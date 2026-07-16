'use client';
import { useEffect } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useSessionTimer } from '@/hooks/useSessionTimer';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ChallengeTimer() {
  useSessionTimer();
  const { totalSeconds, elapsed, isPaused, hasStarted, pauseSession, resumeSession } = useSessionStore();

  const remaining = totalSeconds - elapsed;
  const progress = elapsed / totalSeconds;
  const isLow = remaining < 30 * 60; // < 30 min
  const isCritical = remaining < 10 * 60; // < 10 min
  const currentHourDisplay = Math.floor(elapsed / 3600) + 1;
  const hourProgress = ((elapsed % 3600) / 3600) * 100;

  const circumference = 2 * Math.PI * 54;
  const strokeDash = circumference - progress * circumference;

  if (!hasStarted) return null;

  return (
    <div className={`flex items-center gap-4 px-4 py-2 rounded-xl border transition-all ${
      isCritical
        ? 'border-red-500/50 bg-red-950/30 animate-pulse'
        : isLow
        ? 'border-orange-500/40 bg-orange-950/20'
        : 'border-amber-500/20 bg-zinc-900/80'
    }`}>
      {/* Circular progress */}
      <div className="relative w-16 h-16 flex-shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#27272a" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none"
            stroke={isCritical ? '#ef4444' : isLow ? '#f97316' : '#f59e0b'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDash}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-zinc-300">H{currentHourDisplay}</span>
        </div>
      </div>

      {/* Time display */}
      <div className="flex flex-col min-w-[90px]">
        <span className={`font-mono text-2xl font-bold tabular-nums ${
          isCritical ? 'text-red-400' : isLow ? 'text-orange-400' : 'text-amber-400'
        }`}>
          {formatTime(remaining)}
        </span>
        <span className="text-xs text-zinc-500">remaining</span>
        {/* Hour progress bar */}
        <div className="mt-1 h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500/60 rounded-full transition-all duration-1000"
            style={{ width: `${hourProgress}%` }}
          />
        </div>
      </div>

      {/* Pause/resume */}
      <button
        onClick={() => isPaused ? resumeSession() : pauseSession()}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
          isPaused
            ? 'bg-amber-500 text-black hover:bg-amber-400'
            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
        }`}
        title={isPaused ? 'Resume timer' : 'Pause timer'}
      >
        {isPaused ? '▶' : '⏸'}
      </button>

      {isPaused && (
        <span className="text-xs text-amber-400 font-semibold animate-pulse">PAUSED</span>
      )}
    </div>
  );
}
