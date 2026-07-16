'use client';
import { useState, useEffect, useRef } from 'react';
import type { Exercise } from '@/data/curriculum';
import { CHORDS } from '@/data/chords';
import ChordDiagram from './ChordDiagram';
import PitchDisplay from './PitchDisplay';
import { usePitchDetector } from '@/hooks/usePitchDetector';
import { useSessionStore } from '@/lib/store/sessionStore';
import type { MistakeEvent } from '@/lib/analysis/mistakeAnalysis';
import { isNoteMatchLoose } from '@/lib/analysis/noteUtils';

interface Props {
  exercise: Exercise;
  onComplete: (accuracy: number) => void;
}

export default function ExercisePlayer({ exercise, onComplete }: Props) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [timeLeft, setTimeLeft] = useState(exercise.durationSeconds);
  const [correctHits, setCorrectHits] = useState(0);
  const [totalDetections, setTotalDetections] = useState(0);
  const [currentNoteIdx, setCurrentNoteIdx] = useState(0);
  const [feedback, setFeedback] = useState<'none' | 'hit' | 'miss'>('none');

  const { currentNote, clarity, isActive, start, stop } = usePitchDetector();
  const { addMistake, completeExercise } = useSessionStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accuracy = totalDetections > 0 ? correctHits / totalDetections : 0;

  // Timer countdown
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
    return () => clearInterval(intervalRef.current!);
  }, [phase]);

  // Pitch feedback
  useEffect(() => {
    if (phase !== 'playing' || !currentNote || clarity < 0.8) return;

    const targets = exercise.targetNotes ?? [];
    if (targets.length === 0) {
      // For chord exercises: just check clarity
      if (clarity > 0.85) {
        setCorrectHits(h => h + 1);
        setFeedback('hit');
      } else {
        setFeedback('miss');
        addMistake({
          id: `m-${Date.now()}`,
          type: 'finger-pressure',
          timestamp: Date.now(),
          chordOrNote: exercise.targetChord ?? '',
          clarity,
        } as MistakeEvent);
      }
      setTotalDetections(t => t + 1);
      return;
    }

    const { match, centsOff } = isNoteMatchLoose(currentNote, targets);
    setTotalDetections(t => t + 1);

    if (match) {
      setCorrectHits(h => h + 1);
      setFeedback('hit');
      setTimeout(() => setFeedback('none'), 400);
    } else {
      setFeedback('miss');
      if (Math.abs(centsOff) > 100) {
        addMistake({
          id: `m-${Date.now()}`,
          type: 'wrong-note',
          timestamp: Date.now(),
          chordOrNote: exercise.targetNotes?.[currentNoteIdx] ?? '',
          centsOff,
        } as MistakeEvent);
      } else if (centsOff > 20) {
        addMistake({ id: `m-${Date.now()}`, type: 'intonation-sharp', timestamp: Date.now(), chordOrNote: exercise.targetNotes?.[currentNoteIdx] ?? '', centsOff } as MistakeEvent);
      } else {
        addMistake({ id: `m-${Date.now()}`, type: 'intonation-flat', timestamp: Date.now(), chordOrNote: exercise.targetNotes?.[currentNoteIdx] ?? '', centsOff } as MistakeEvent);
      }
      setTimeout(() => setFeedback('none'), 600);
    }
  }, [currentNote, clarity, phase, exercise, currentNoteIdx, addMistake]);

  const handleStart = async () => {
    await start();
    setPhase('playing');
    setTimeLeft(exercise.durationSeconds);
    setCorrectHits(0);
    setTotalDetections(0);
  };

  const handleComplete = () => {
    stop();
    completeExercise(exercise.id);
    onComplete(accuracy);
  };

  const targetChord = exercise.targetChord ? CHORDS[exercise.targetChord] : null;
  const fromChord = exercise.fromChord ? CHORDS[exercise.fromChord] : null;
  const toChord = exercise.toChord ? CHORDS[exercise.toChord] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Exercise header */}
      <div className={`p-4 rounded-xl border transition-all ${
        feedback === 'hit' ? 'border-green-500/60 bg-green-500/5' :
        feedback === 'miss' ? 'border-red-500/40 bg-red-500/5' :
        'border-zinc-700/60 bg-zinc-900/40'
      }`}>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">{exercise.title}</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">{exercise.instruction}</p>
      </div>

      {/* Chord diagrams */}
      {(targetChord || fromChord || toChord) && (
        <div className="flex gap-6 justify-center flex-wrap">
          {fromChord && (
            <div className="flex flex-col items-center gap-1">
              <ChordDiagram chord={fromChord} size="md" />
              <span className="text-xs text-zinc-500">From</span>
            </div>
          )}
          {fromChord && toChord && (
            <div className="flex items-center text-2xl text-zinc-600 pb-8">→</div>
          )}
          {toChord && (
            <div className="flex flex-col items-center gap-1">
              <ChordDiagram chord={toChord} size="md" />
              <span className="text-xs text-zinc-500">To</span>
            </div>
          )}
          {targetChord && !fromChord && (
            <ChordDiagram chord={targetChord} size="lg" />
          )}
        </div>
      )}

      {/* Target note display */}
      {exercise.targetNotes && exercise.targetNotes.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {exercise.targetNotes.map((n, i) => (
            <div
              key={n}
              className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold border transition-all ${
                i === currentNoteIdx && phase === 'playing'
                  ? 'border-amber-400 bg-amber-400/10 text-amber-400 scale-110'
                  : 'border-zinc-700 bg-zinc-800/60 text-zinc-400'
              }`}
            >
              {n}
            </div>
          ))}
        </div>
      )}

      {/* Pitch display + timer row */}
      <div className="flex items-center justify-around gap-4">
        <PitchDisplay
          note={currentNote}
          clarity={clarity}
          targetNote={exercise.targetNotes?.[currentNoteIdx]}
          isActive={isActive}
          onStart={handleStart}
        />

        {phase !== 'ready' && (
          <div className="flex flex-col items-center gap-2">
            {/* Timer ring */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#27272a" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke={phase === 'done' ? '#22c55e' : '#f59e0b'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - timeLeft / exercise.durationSeconds)}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold tabular-nums ${phase === 'done' ? 'text-green-400' : 'text-amber-400'}`}>
                  {phase === 'done' ? '✓' : timeLeft}
                </span>
              </div>
            </div>

            {/* Accuracy */}
            {totalDetections > 0 && (
              <div className="text-center">
                <span className={`text-xl font-bold ${
                  accuracy >= 0.8 ? 'text-green-400' :
                  accuracy >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {Math.round(accuracy * 100)}%
                </span>
                <p className="text-xs text-zinc-500">accuracy</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {phase === 'ready' && (
          <button
            onClick={handleStart}
            className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all"
          >
            Start Exercise
          </button>
        )}
        {phase === 'playing' && (
          <button
            onClick={() => { setPhase('done'); stop(); }}
            className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 border border-zinc-700 transition-all"
          >
            Skip
          </button>
        )}
        {phase === 'done' && (
          <>
            <button
              onClick={() => {
                setPhase('ready');
                setTimeLeft(exercise.durationSeconds);
                setCorrectHits(0);
                setTotalDetections(0);
              }}
              className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700 border border-zinc-700 transition-all"
            >
              Retry
            </button>
            <button
              onClick={handleComplete}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                accuracy >= exercise.successThreshold
                  ? 'bg-green-500 text-white hover:bg-green-400'
                  : 'bg-amber-500 text-black hover:bg-amber-400'
              }`}
            >
              {accuracy >= exercise.successThreshold ? '✓ Complete!' : 'Continue Anyway →'}
            </button>
          </>
        )}
      </div>

      {phase === 'done' && (
        <div className={`p-3 rounded-lg text-sm text-center ${
          accuracy >= exercise.successThreshold
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
        }`}>
          {accuracy >= exercise.successThreshold
            ? `Great job! ${Math.round(accuracy * 100)}% accuracy — exercise complete.`
            : `${Math.round(accuracy * 100)}% accuracy. Try again for better results, or continue to the next exercise.`
          }
        </div>
      )}
    </div>
  );
}
