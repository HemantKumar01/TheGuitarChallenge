'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { usePitchDetector } from '@/hooks/usePitchDetector';
import { freqToNote } from '@/lib/analysis/noteUtils';

// Standard tuning: low E to high e
const STRINGS = [
  { name: 'E2', label: '6 — Low E', freq: 82.41,  color: 'from-red-500 to-red-600' },
  { name: 'A2', label: '5 — A',     freq: 110.00, color: 'from-orange-500 to-orange-600' },
  { name: 'D3', label: '4 — D',     freq: 146.83, color: 'from-yellow-500 to-yellow-600' },
  { name: 'G3', label: '3 — G',     freq: 196.00, color: 'from-green-500 to-green-600' },
  { name: 'B3', label: '2 — B',     freq: 246.94, color: 'from-cyan-500 to-cyan-600' },
  { name: 'E4', label: '1 — High e', freq: 329.63, color: 'from-violet-500 to-violet-600' },
];

// Detect which open string is closest to the detected frequency
function closestString(freq: number) {
  let best = STRINGS[0];
  let bestDiff = Infinity;
  for (const s of STRINGS) {
    const cents = 1200 * Math.log2(freq / s.freq);
    if (Math.abs(cents) < Math.abs(bestDiff)) {
      bestDiff = cents;
      best = s;
    }
  }
  return { string: best, cents: Math.round(bestDiff) };
}

interface StringState {
  tuned: boolean;
  lastCents: number | null;
}

export default function GuitarTuner({ onAllTuned }: { onAllTuned: () => void }) {
  const { isActive, isSupported, currentNote, clarity, error, start, stop } = usePitchDetector();
  const [stringStates, setStringStates] = useState<Record<string, StringState>>(
    Object.fromEntries(STRINGS.map(s => [s.name, { tuned: false, lastCents: null }]))
  );
  const [activeString, setActiveString] = useState<typeof STRINGS[0] | null>(null);
  const [detectedCents, setDetectedCents] = useState<number | null>(null);
  // Track stable in-tune readings to debounce confirmation
  const stableCountRef = useRef(0);
  const lastCentsRef = useRef<number | null>(null);

  const tunedCount = Object.values(stringStates).filter(s => s.tuned).length;
  const allTuned = tunedCount === STRINGS.length;

  // Process pitch detections
  useEffect(() => {
    if (!currentNote || clarity < 0.88 || currentNote.frequency < 60) {
      stableCountRef.current = 0;
      return;
    }
    const { string, cents } = closestString(currentNote.frequency);
    setActiveString(string);
    setDetectedCents(cents);

    setStringStates(prev => ({
      ...prev,
      [string.name]: { ...prev[string.name], lastCents: cents },
    }));

    // Require 6 consecutive in-tune readings to confirm (debounce jitter)
    if (Math.abs(cents) <= 8) {
      if (Math.abs((lastCentsRef.current ?? 999) - cents) < 5) {
        stableCountRef.current += 1;
      } else {
        stableCountRef.current = 1;
      }
      if (stableCountRef.current >= 6) {
        setStringStates(prev => ({
          ...prev,
          [string.name]: { tuned: true, lastCents: cents },
        }));
        stableCountRef.current = 0;
      }
    } else {
      stableCountRef.current = 0;
    }
    lastCentsRef.current = cents;
  }, [currentNote, clarity]);

  // Needle angle: ±50 cents maps to ±70deg
  const needleAngle = detectedCents !== null ? Math.max(-70, Math.min(70, detectedCents * 1.4)) : 0;

  const inTune = detectedCents !== null && Math.abs(detectedCents) <= 8;
  const slightlyOff = detectedCents !== null && Math.abs(detectedCents) > 8 && Math.abs(detectedCents) <= 25;

  const needleColor = !activeString ? '#52525b' :
    inTune ? '#22c55e' :
    slightlyOff ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Tuner dial */}
      <div className="relative w-72 h-40 select-none">
        {/* Arc background */}
        <svg viewBox="0 0 288 160" className="w-full h-full" style={{ overflow: 'visible' }}>
          {/* Scale arc */}
          <path d="M 24 140 A 120 120 0 0 1 264 140" fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
          {/* Green in-tune zone */}
          <path d="M 132 24 A 120 120 0 0 1 156 24" fill="none" stroke="#166534" strokeWidth="8" strokeLinecap="round" />

          {/* Tick marks */}
          {[-50, -25, 0, 25, 50].map(c => {
            const angle = (c / 50) * 70 * (Math.PI / 180);
            const cx = 144 + 120 * Math.sin(angle);
            const cy = 140 - 120 * Math.cos(angle);
            const ix = 144 + 108 * Math.sin(angle);
            const iy = 140 - 108 * Math.cos(angle);
            return (
              <g key={c}>
                <line x1={ix} y1={iy} x2={cx} y2={cy}
                  stroke={c === 0 ? '#22c55e' : '#3f3f46'} strokeWidth={c === 0 ? 2 : 1} />
                <text x={cx + Math.sin(angle) * 14} y={cy - Math.cos(angle) * 14}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="9" fill={c === 0 ? '#4ade80' : '#52525b'}>
                  {c === 0 ? '0' : `${c > 0 ? '+' : ''}${c}`}
                </text>
              </g>
            );
          })}

          {/* Needle */}
          <g style={{ transform: `rotate(${needleAngle}deg)`, transformOrigin: '144px 140px', transition: 'transform 80ms ease-out' }}>
            <line x1="144" y1="140" x2="144" y2="30"
              stroke={needleColor} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="144" cy="30" r="4" fill={needleColor} />
          </g>

          {/* Pivot dot */}
          <circle cx="144" cy="140" r="6" fill="#3f3f46" />
          <circle cx="144" cy="140" r="3" fill="#71717a" />
        </svg>

        {/* Cents readout */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-0.5">
          {activeString ? (
            <>
              <span className={`text-3xl font-black font-mono tabular-nums ${
                inTune ? 'text-green-400' : slightlyOff ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {detectedCents !== null ? (detectedCents > 0 ? `+${detectedCents}` : `${detectedCents}`) : '—'}¢
              </span>
              <span className="text-xs text-zinc-500">
                {inTune ? '✓ In tune' : detectedCents! > 0 ? '▼ Tune down' : '▲ Tune up'}
              </span>
            </>
          ) : (
            <span className="text-sm text-zinc-600">Pluck a string…</span>
          )}
        </div>
      </div>

      {/* Detected string label */}
      {activeString && (
        <div className={`px-5 py-2 rounded-full text-sm font-bold bg-gradient-to-r ${activeString.color} text-white shadow-lg`}>
          Detected: String {activeString.label}
        </div>
      )}

      {/* Per-string status grid */}
      <div className="grid grid-cols-6 gap-2 w-full">
        {STRINGS.map(s => {
          const state = stringStates[s.name];
          const isActive = activeString?.name === s.name;
          const cents = state.lastCents;
          return (
            <div
              key={s.name}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                state.tuned
                  ? 'border-green-500/60 bg-green-500/10'
                  : isActive
                  ? 'border-amber-400/60 bg-amber-500/10 scale-105'
                  : 'border-zinc-700/60 bg-zinc-900/40'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br ${s.color} ${
                state.tuned ? 'opacity-100' : 'opacity-40'
              }`}>
                {state.tuned ? '✓' : s.name.replace(/\d/, '')}
              </div>
              <span className={`text-xs font-mono ${
                state.tuned ? 'text-green-400' :
                isActive ? (inTune ? 'text-green-400' : slightlyOff ? 'text-yellow-400' : 'text-red-400') :
                'text-zinc-600'
              }`}>
                {state.tuned ? '+0¢' : cents !== null ? `${cents > 0 ? '+' : ''}${cents}¢` : '—'}
              </span>
              <span className="text-xs text-zinc-600 leading-none">{s.name}</span>
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>{tunedCount}/6 strings tuned</span>
          {allTuned && <span className="text-green-400 font-semibold">All in tune!</span>}
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-500"
            style={{ width: `${(tunedCount / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Mic button / error */}
      {!isActive ? (
        <button
          onClick={start}
          disabled={!isSupported}
          className="px-8 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all disabled:opacity-40"
        >
          🎤 Enable Microphone
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Mic active — pluck each string and hold until confirmed
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400 text-center max-w-xs">{error}</p>
      )}

      {/* CTA */}
      {allTuned && (
        <button
          onClick={() => { stop(); onAllTuned(); }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-lg hover:from-amber-400 hover:to-orange-400 transition-all shadow-xl animate-pulse"
        >
          🎸 Guitar Tuned — Start the Challenge!
        </button>
      )}

      {/* Skip */}
      <button
        onClick={() => { stop(); onAllTuned(); }}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
      >
        Skip tuning (already in tune)
      </button>
    </div>
  );
}
