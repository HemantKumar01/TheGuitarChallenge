'use client';
import type { DetectedNote } from '@/lib/analysis/noteUtils';
import { getFeedbackColor, getFeedbackLabel } from '@/lib/analysis/noteUtils';

interface Props {
  note: DetectedNote | null;
  clarity: number;
  targetNote?: string;
  isActive: boolean;
  onStart?: () => void;
}

export default function PitchDisplay({ note, clarity, targetNote, isActive, onStart }: Props) {
  const feedback = note && targetNote
    ? (() => {
        const targetName = targetNote.replace(/\d/, '');
        if (note.name === targetName) {
          return getFeedbackColor(note.centsOff);
        }
        return 'red' as const;
      })()
    : null;

  const colorMap = {
    green: { ring: 'border-green-400', bg: 'bg-green-400/10', text: 'text-green-400', glow: 'shadow-green-400/30' },
    yellow: { ring: 'border-yellow-400', bg: 'bg-yellow-400/10', text: 'text-yellow-400', glow: 'shadow-yellow-400/30' },
    red: { ring: 'border-red-400', bg: 'bg-red-400/10', text: 'text-red-400', glow: 'shadow-red-400/30' },
  };

  const colors = feedback ? colorMap[feedback] : null;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Main display */}
      <div className={`relative w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-150 ${
        colors
          ? `${colors.ring} ${colors.bg} shadow-lg ${colors.glow}`
          : 'border-zinc-700 bg-zinc-900/60'
      }`}>
        {isActive && note ? (
          <>
            <span className={`text-4xl font-black tabular-nums leading-none ${colors?.text ?? 'text-zinc-200'}`}>
              {note.name}
            </span>
            <span className="text-sm text-zinc-400">{note.octave}</span>
            <span className={`text-xs mt-1 font-mono ${
              Math.abs(note.centsOff) <= 10 ? 'text-green-400' :
              Math.abs(note.centsOff) <= 30 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {note.centsOff > 0 ? '+' : ''}{note.centsOff}¢
            </span>
          </>
        ) : isActive ? (
          <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-zinc-500">Listening…</span>
          </div>
        ) : (
          <button
            onClick={onStart}
            className="flex flex-col items-center gap-1 group"
          >
            <span className="text-3xl group-hover:scale-110 transition-transform">🎤</span>
            <span className="text-xs text-zinc-400 group-hover:text-amber-400">Enable mic</span>
          </button>
        )}
      </div>

      {/* Cents deviation bar */}
      {isActive && note && (
        <div className="w-36 flex flex-col gap-1">
          <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
            {/* Center marker */}
            <div className="absolute left-1/2 top-0 w-0.5 h-full bg-zinc-600 -translate-x-1/2" />
            {/* Deviation indicator */}
            <div
              className={`absolute top-0 h-full w-2 rounded-full transition-all duration-75 ${
                Math.abs(note.centsOff) <= 20 ? 'bg-green-400' :
                Math.abs(note.centsOff) <= 50 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{
                left: `calc(50% + ${(note.centsOff / 100) * 50}% - 4px)`,
              }}
            />
          </div>
          {/* Label */}
          <p className="text-xs text-center text-zinc-400 leading-tight">
            {targetNote ? getFeedbackLabel(note.centsOff) : `${note.label} detected`}
          </p>
        </div>
      )}

      {/* Clarity bar */}
      {isActive && (
        <div className="flex items-center gap-2 w-36">
          <span className="text-xs text-zinc-600">Signal</span>
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500/60 rounded-full transition-all duration-100"
              style={{ width: `${clarity * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
