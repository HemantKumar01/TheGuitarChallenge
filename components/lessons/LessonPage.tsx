'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { HourLesson } from '@/data/curriculum';
import { CURRICULUM } from '@/data/curriculum';
import ExercisePlayer from '@/components/ui/ExercisePlayer';
import FretboardGame from '@/components/ui/FretboardGame';
import MetronomePanel from '@/components/ui/MetronomePanel';
import SideQuestPanel from '@/components/ui/SideQuestPanel';
import BackingTrackPanel from '@/components/ui/BackingTrackPanel';
import { useSessionStore } from '@/lib/store/sessionStore';
import { CHORDS } from '@/data/chords';
import ChordDiagram from '@/components/ui/ChordDiagram';
import { SONGS } from '@/data/songs';

interface Props {
  lesson: HourLesson;
  lessonIndex: number;
}

export default function LessonPage({ lesson, lessonIndex }: Props) {
  const router = useRouter();
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [completedExs, setCompletedExs] = useState<Set<string>>(new Set());
  const [showTheory, setShowTheory] = useState(true);
  const { completedExercises, selectedSongId } = useSessionStore();

  const nextLesson = lessonIndex < CURRICULUM.length - 1 ? CURRICULUM[lessonIndex + 1] : null;
  const nextLessonIdx = lessonIndex + 1;

  const currentExercise = lesson.exercises[exerciseIdx];
  const allDone = lesson.exercises.every(e => completedExs.has(e.id) || completedExercises.includes(e.id));

  const handleExerciseComplete = (accuracy: number) => {
    if (currentExercise) {
      setCompletedExs(prev => new Set([...prev, currentExercise.id]));
    }
    if (exerciseIdx < lesson.exercises.length - 1) {
      setTimeout(() => setExerciseIdx(i => i + 1), 500);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
      {/* Main lesson content */}
      <div className="flex flex-col gap-6">
        {/* Lesson header */}
        <div className={`rounded-2xl p-6 bg-gradient-to-br ${lesson.color} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{lesson.icon}</span>
              <div>
                <p className="text-xs text-white/60 font-medium uppercase tracking-wider">Lesson {lessonIndex + 1} of {CURRICULUM.length}</p>
                <h1 className="text-2xl font-black text-white">{lesson.title}</h1>
              </div>
            </div>
            <p className="text-white/80">{lesson.subtitle}</p>
          </div>
        </div>

        {/* Theory section */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTheory(!showTheory)}
            className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/40 transition-colors"
          >
            <span className="text-sm font-semibold text-zinc-200">📚 Key Concepts</span>
            <span className="text-zinc-500 text-sm">{showTheory ? '▲ Hide' : '▼ Show'}</span>
          </button>
          {showTheory && (
            <div className="p-4 pt-0 border-t border-zinc-800/60">
              <ul className="flex flex-col gap-2.5">
                {lesson.theory.map((tip, i) => (
                  <li key={i} className="flex gap-3 text-sm text-zinc-300 leading-relaxed">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">▸</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Chords introduced */}
        {lesson.chordsIntroduced.length > 0 && (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-200 mb-4">🎸 New Chords This Hour</h3>
            <div className="flex gap-6 flex-wrap">
              {lesson.chordsIntroduced.map(name => {
                const chord = CHORDS[name];
                if (!chord) return null;
                return <ChordDiagram key={name} chord={chord} size="md" />;
              })}
            </div>
          </div>
        )}

        {/* Riff tab for riff-based song lessons */}
        {currentExercise?.songId && (() => {
          const song = SONGS.find(s => s.id === currentExercise.songId);
          return song?.isRiffBased && song.riffTab ? (
            <div className="bg-zinc-900/80 border border-amber-500/20 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-amber-400 mb-3">🎸 The Riff (Tablature)</h3>
              <pre className="text-xs font-mono text-zinc-300 leading-relaxed overflow-x-auto bg-zinc-950/60 p-4 rounded-lg border border-zinc-800">
                {song.riffTab}
              </pre>
              <p className="text-xs text-zinc-500 mt-2">
                Each number = fret to press on the A string (5th string). 0 = open string. Pick each note individually — no strumming.
              </p>
            </div>
          ) : null;
        })()}

        {/* Exercise list navigation */}
        <div className="flex gap-2 flex-wrap">
          {lesson.exercises.map((ex, i) => {
            const done = completedExs.has(ex.id) || completedExercises.includes(ex.id);
            return (
              <button
                key={ex.id}
                onClick={() => setExerciseIdx(i)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  i === exerciseIdx
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                    : done
                    ? 'border-green-500/40 bg-green-500/5 text-green-400'
                    : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                {done && <span>✓</span>}
                {ex.title}
              </button>
            );
          })}
        </div>

        {/* Active exercise */}
        {currentExercise && currentExercise.type === 'fretboard-game' && currentExercise.fretTargets ? (
          <FretboardGame
            key={currentExercise.id}
            targets={currentExercise.fretTargets}
            timeLimit={currentExercise.durationSeconds}
            title={currentExercise.title}
            instruction={currentExercise.instruction}
            successThreshold={currentExercise.successThreshold}
            onComplete={(accuracy) => {
              handleExerciseComplete(accuracy);
            }}
          />
        ) : currentExercise ? (
          <ExercisePlayer
            key={currentExercise.id}
            exercise={currentExercise}
            onComplete={handleExerciseComplete}
          />
        ) : null}

        {/* Completion message + Next Hour button */}
        {allDone && (
          <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/30">
            <p className="text-green-300 font-semibold text-base mb-2">🎉 Hour {lesson.hour + 1} Complete!</p>
            <p className="text-green-200/80 text-sm leading-relaxed">{lesson.completionMessage}</p>
            {nextLesson && (
              <button
                onClick={() => router.push(`/session/${nextLessonIdx}`)}
                className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold hover:from-amber-400 hover:to-orange-400 transition-all"
              >
                Next: {nextLesson.title} →
              </button>
            )}
          </div>
        )}

        {/* Skip to next hour button (always available) */}
        {nextLesson && !allDone && (
          <button
            onClick={() => router.push(`/session/${nextLessonIdx}`)}
            className="w-full py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-medium hover:border-amber-500/40 hover:text-amber-400 transition-all"
          >
            Skip to next hour: {nextLesson.title} →
          </button>
        )}

        {/* Song backing track */}
        {currentExercise?.songId && (
          <BackingTrackPanel
            songId={currentExercise.songId}
            bpm={currentExercise.bpm ?? 80}
          />
        )}
      </div>

      {/* Right sidebar */}
      <div className="flex flex-col gap-4">
        <MetronomePanel initialBpm={currentExercise?.bpm ?? 80} />
        <SideQuestPanel />

        {/* Progress overview */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-zinc-300 mb-3">Your Progress</h3>
          <div className="flex flex-col gap-2">
            {CURRICULUM.map((l, i) => {
              const lDone = l.exercises.every(e => completedExercises.includes(e.id));
              return (
                <div key={i} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                  i === lessonIndex
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                    : lDone
                    ? 'bg-zinc-800/60 text-green-400'
                    : 'text-zinc-600'
                }`}>
                  <span>{l.icon}</span>
                  <span className="flex-1">{l.title}</span>
                  {lDone && <span>✓</span>}
                  {i === lessonIndex && <span>●</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
