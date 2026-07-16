'use client';
import { useState, useEffect, useRef } from 'react';
import { usePitchDetector } from '@/hooks/usePitchDetector';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { MistakeEvent } from '@/lib/analysis/mistakeAnalysis';

// Guitar standard tuning: string number (1=high e, 6=low E) → open note frequency
const STRING_OPEN: Record<number, { note: string; freq: number }> = {
  6: { note: 'E2', freq: 82.41 },
  5: { note: 'A2', freq: 110.00 },
  4: { note: 'D3', freq: 146.83 },
  3: { note: 'G3', freq: 196.00 },
  2: { note: 'B3', freq: 246.94 },
  1: { note: 'E4', freq: 329.63 },
};

const STRING_COLORS: Record<number, string> = {
  6: 'text-red-400 border-red-400/60 bg-red-400/10',
  5: 'text-orange-400 border-orange-400/60 bg-orange-400/10',
  4: 'text-yellow-400 border-yellow-400/60 bg-yellow-400/10',
  3: 'text-green-400 border-green-400/60 bg-green-400/10',
  2: 'text-cyan-400 border-cyan-400/60 bg-cyan-400/10',
  1: 'text-violet-400 border-violet-400/60 bg-violet-400/10',
};

const STRING_LABELS: Record<number, string> = {
  6: 'Low E', 5: 'A', 4: 'D', 3: 'G', 2: 'B', 1: 'High e',
};

export interface FretTarget {
  string: number; // 1-6
  fret: number;   // 0-12
}

interface Props {
  targets: FretTarget[];
  timeLimit: number;
  title: string;
  instruction: string;
  successThreshold: number;
  onComplete: (accuracy: number) => void;
}

function getExpectedFreq(target: FretTarget): number {
  return STRING_OPEN[target.string].freq * Math.pow(2, target.fret / 12);
}

function getExpectedNote(target: FretTarget): string {
  const freq = getExpectedFreq(target);
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export default function FretboardGame({ targets, timeLimit, title, instruction, successThreshold, onComplete }: Props) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [hitFeedback, setHitFeedback] = useState<'none' | 'hit' | 'miss'>('none');
  const [lastDetected, setLastDetected] = useState<string | null>(null);

  const { currentNote, clarity, signalLevel, isActive, start, stop } = usePitchDetector();
  const { addMistake, completeExercise } = useSessionStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownRef = useRef(false);

  const currentTarget = targets[currentIdx] ?? null;
  const accuracy = (score + misses) > 0 ? score / (score + misses) : 0;
  const progress = currentIdx / targets.length;

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          setPhase('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [phase]);

  // Note detection matching
  useEffect(() => {
    if (phase !== 'playing' || !currentNote || !currentTarget || cooldownRef.current) return;
    if (clarity < 0.8) return;

    setLastDetected(currentNote.label);

    const expectedFreq = getExpectedFreq(currentTarget);
    const cents = Math.round(1200 * Math.log2(currentNote.frequency / expectedFreq));

    if (Math.abs(cents) <= 60) {
      // Hit!
      cooldownRef.current = true;
      setScore(s => s + 1);
      setStreak(s => {
        const newStreak = s + 1;
        setBestStreak(b => Math.max(b, newStreak));
        return newStreak;
      });
      setHitFeedback('hit');

      setTimeout(() => {
        setHitFeedback('none');
        cooldownRef.current = false;
        if (currentIdx < targets.length - 1) {
          setCurrentIdx(i => i + 1);
        } else {
          setPhase('done');
        }
      }, 500);
    } else if (Math.abs(cents) > 150) {
      // Only count as miss if significantly wrong
      cooldownRef.current = true;
      setMisses(m => m + 1);
      setStreak(0);
      setHitFeedback('miss');

      addMistake({
        id: `m-${Date.now()}`,
        type: 'wrong-note',
        timestamp: Date.now(),
        chordOrNote: getExpectedNote(currentTarget),
        centsOff: cents,
      } as MistakeEvent);

      setTimeout(() => {
        setHitFeedback('none');
        cooldownRef.current = false;
      }, 600);
    }
  }, [currentNote, clarity, phase, currentTarget, currentIdx, targets.length, addMistake]);

  const handleStart = async () => {
    await start();
    setPhase('playing');
    setCurrentIdx(0);
    setScore(0);
    setMisses(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(timeLimit);
  };

  const handleComplete = () => {
    stop();
    onComplete(accuracy);
  };

  // Visual fretboard (mini)
  const renderFretboard = () => {
    if (!currentTarget) return null;
    const maxFret = Math.max(5, ...targets.map(t => t.fret)) + 1;
    const frets = Array.from({ length: maxFret + 1 }, (_, i) => i);

    return (
      <div className="w-full overflow-x-auto">
        <div className="min-w-[400px] p-4">
          {/* Fret numbers */}
          <div className="flex mb-1 pl-10">
            {frets.map(f => (
              <div key={f} className="flex-1 text-center text-xs text-zinc-600 font-mono">
                {f}
              </div>
            ))}
          </div>
          {/* Strings */}
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div key={s} className="flex items-center h-7">
              <span className="w-10 text-xs text-zinc-500 text-right pr-2 font-mono">
                {STRING_LABELS[s]}
              </span>
              <div className="flex-1 flex relative">
                {/* String line */}
                <div className={`absolute top-1/2 left-0 right-0 h-px ${
                  s <= 2 ? 'bg-zinc-600' : s <= 4 ? 'bg-zinc-500' : 'bg-zinc-400'
                }`} />
                {/* Fret markers */}
                {frets.map(f => (
                  <div key={f} className="flex-1 relative flex items-center justify-center">
                    {f > 0 && (
                      <div className="absolute left-0 top-0 bottom-0 w-px bg-zinc-700" />
                    )}
                    {/* Target marker */}
                    {currentTarget.string === s && currentTarget.fret === f && (
                      <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold animate-pulse ${
                        hitFeedback === 'hit' ? 'bg-green-500 text-white scale-125' :
                        hitFeedback === 'miss' ? 'bg-red-500 text-white' :
                        'bg-amber-500 text-black'
                      } transition-all duration-150`}>
                        {f}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Fret dots */}
          <div className="flex pl-10 mt-1">
            {frets.map(f => (
              <div key={f} className="flex-1 flex justify-center">
                {[3, 5, 7, 9, 12].includes(f) && (
                  <div className={`w-2 h-2 rounded-full ${f === 12 ? 'bg-zinc-500' : 'bg-zinc-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className={`p-4 rounded-xl border transition-all ${
        hitFeedback === 'hit' ? 'border-green-500/60 bg-green-500/5' :
        hitFeedback === 'miss' ? 'border-red-500/40 bg-red-500/5' :
        'border-zinc-700/60 bg-zinc-900/40'
      }`}>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">{title}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">{instruction}</p>
      </div>

      {/* Current target — big display */}
      {phase === 'playing' && currentTarget && (
        <div className="flex flex-col items-center gap-3">
          <div className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-200 ${
            hitFeedback === 'hit' ? 'border-green-400 bg-green-500/10 scale-105' :
            hitFeedback === 'miss' ? 'border-red-400 bg-red-500/10 scale-95' :
            STRING_COLORS[currentTarget.string]
          }`}>
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">String</span>
              <span className="text-4xl font-black tabular-nums">{currentTarget.string}</span>
              <span className="text-xs text-zinc-400">{STRING_LABELS[currentTarget.string]}</span>
            </div>
            <div className="w-px h-16 bg-zinc-700" />
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Fret</span>
              <span className="text-4xl font-black tabular-nums">{currentTarget.fret}</span>
              <span className="text-xs text-zinc-400">{getExpectedNote(currentTarget)}</span>
            </div>
          </div>

          {/* Streak indicator */}
          {streak >= 3 && (
            <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-sm font-bold animate-bounce">
              {streak}x Streak!
            </div>
          )}
        </div>
      )}

      {/* Mini fretboard */}
      {phase === 'playing' && renderFretboard()}

      {/* Stats row */}
      {phase !== 'ready' && (
        <div className="flex items-center justify-between px-2">
          <div className="flex gap-4">
            <div className="text-center">
              <span className="text-lg font-bold text-green-400">{score}</span>
              <p className="text-xs text-zinc-500">Hits</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-red-400">{misses}</span>
              <p className="text-xs text-zinc-500">Misses</p>
            </div>
            <div className="text-center">
              <span className="text-lg font-bold text-amber-400">{bestStreak}</span>
              <p className="text-xs text-zinc-500">Best Streak</p>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <span className={`text-2xl font-bold tabular-nums ${timeLeft < 10 ? 'text-red-400 animate-pulse' : 'text-zinc-300'}`}>
              {timeLeft}s
            </span>
            <p className="text-xs text-zinc-500">{currentIdx + 1}/{targets.length}</p>
          </div>

          <div className="text-center">
            <span className={`text-xl font-bold ${
              accuracy >= 0.8 ? 'text-green-400' :
              accuracy >= 0.5 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {Math.round(accuracy * 100)}%
            </span>
            <p className="text-xs text-zinc-500">Accuracy</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {phase === 'playing' && (
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Signal indicator */}
      {phase === 'playing' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600 w-14 flex-shrink-0">Signal</span>
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${signalLevel * 100}%`,
                background: signalLevel > 0.15 ? '#22c55e' : signalLevel > 0.02 ? '#eab308' : '#52525b',
              }}
            />
          </div>
          {lastDetected && (
            <span className="text-xs text-zinc-400 font-mono w-10 text-right">{lastDetected}</span>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {phase === 'ready' && (
          <button
            onClick={handleStart}
            className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all"
          >
            Start Game
          </button>
        )}
        {phase === 'playing' && (
          <button
            onClick={() => { setPhase('done'); stop(); }}
            className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 border border-zinc-700 transition-all"
          >
            End Early
          </button>
        )}
        {phase === 'done' && (
          <>
            <button
              onClick={() => {
                setPhase('ready');
                setCurrentIdx(0);
                setScore(0);
                setMisses(0);
                setStreak(0);
                setBestStreak(0);
                setTimeLeft(timeLimit);
              }}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 border border-zinc-700 transition-all"
            >
              Retry
            </button>
            <button
              onClick={handleComplete}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                accuracy >= successThreshold
                  ? 'bg-green-500 text-white hover:bg-green-400'
                  : 'bg-amber-500 text-black hover:bg-amber-400'
              }`}
            >
              {accuracy >= successThreshold ? '✓ Complete!' : 'Continue Anyway →'}
            </button>
          </>
        )}
      </div>

      {/* Results */}
      {phase === 'done' && (
        <div className={`p-4 rounded-xl text-center ${
          accuracy >= successThreshold
            ? 'bg-green-500/10 border border-green-500/30'
            : 'bg-yellow-500/10 border border-yellow-500/30'
        }`}>
          <p className={`text-lg font-bold ${accuracy >= successThreshold ? 'text-green-400' : 'text-yellow-400'}`}>
            {accuracy >= successThreshold ? 'Great job!' : 'Keep practicing!'}
          </p>
          <p className="text-sm text-zinc-400 mt-1">
            {score} hits, {misses} misses — {Math.round(accuracy * 100)}% accuracy. Best streak: {bestStreak}
          </p>
        </div>
      )}
    </div>
  );
}
