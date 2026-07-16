'use client';
import Link from 'next/link';
import { useSessionStore } from '@/lib/store/sessionStore';
import { CURRICULUM } from '@/data/curriculum';
import { SONGS } from '@/data/songs';

export default function LandingPage() {
  const { hasStarted, elapsed, resetSession } = useSessionStore();
  const totalSeconds = 8 * 60 * 60;
  const progressPct = Math.round((elapsed / totalSeconds) * 100);
  const currentHour = Math.min(Math.floor(elapsed / 3600), CURRICULUM.length - 1);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 flex flex-col">
      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-medium mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Advanced AI Guitar Teaching System
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-4 leading-none">
              <span className="text-zinc-100">Learn Guitar</span>
              <br />
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                in 8 Hours
              </span>
            </h1>

            <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-4 leading-relaxed">
              From zero to playing 3 real songs. Microphone feedback, guided lessons, metronome, and a personalized practice system that adapts to your mistakes.
            </p>
            <p className="text-sm text-zinc-600 mb-10">
              No prior musical experience required. Just a guitar, a mic, and 8 hours.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {hasStarted ? (
                <>
                  <Link
                    href={`/session/${currentHour}`}
                    className="px-8 py-4 rounded-2xl bg-amber-500 text-black font-black text-lg hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 hover:scale-105"
                  >
                    Continue Challenge →
                  </Link>
                  <button
                    onClick={resetSession}
                    className="px-6 py-3 rounded-2xl border border-zinc-700 text-zinc-400 hover:border-red-500/40 hover:text-red-400 transition-all text-sm"
                  >
                    Reset &amp; Start Over
                  </button>
                </>
              ) : (
                <Link
                  href="/tune"
                  className="px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xl hover:from-amber-400 hover:to-orange-400 transition-all shadow-2xl shadow-amber-500/20 hover:shadow-amber-400/30 hover:scale-105"
                >
                  🎸 Start the 8-Hour Challenge
                </Link>
              )}
            </div>

            {hasStarted && elapsed > 0 && (
              <div className="mt-8 max-w-sm mx-auto">
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Progress</span>
                  <span>{progressPct}% complete</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🎤', title: 'Mic Feedback', desc: 'Real-time pitch detection (McLeod algorithm) tells you exactly which note you played and how many cents off you are.' },
              { icon: '⏱', title: '8-Hour Timer', desc: 'Countdown timer with pause control. Visual progress rings show exactly where you are in the challenge.' },
              { icon: '🥁', title: 'Smart Metronome', desc: 'Accurate Web Audio clock metronome. Switch between drums-only, instrumental, or full track backing.' },
              { icon: '🎸', title: '3 Real Songs', desc: "Seven Nation Army, Rasputin, Pirates of the Caribbean — from iconic riff to full chord progressions." },
              { icon: '🎯', title: 'Fretboard Game', desc: 'Gamified practice: a string and fret flash on screen — play it correctly to score. Builds muscle memory through reflex.' },
              { icon: '📚', title: '8-Hour Curriculum', desc: 'Research-backed lesson sequence from Justin Guitar + Fender Play methods. Zero to songs in one session.' },
            ].map(f => (
              <div key={f.title} className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-amber-500/20 transition-all">
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="font-bold text-zinc-100 mb-1">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Curriculum */}
        <section className="max-w-5xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-black text-zinc-100 mb-6 text-center">What You&apos;ll Learn</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CURRICULUM.map((lesson, i) => (
              <div key={i} className={`p-4 rounded-xl bg-gradient-to-br ${lesson.color} relative overflow-hidden group`}>
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{lesson.icon}</span>
                    <span className="text-xs text-white/60 font-semibold">HOUR {lesson.hour + 1}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{lesson.title}</h3>
                  <p className="text-xs text-white/60 mt-1 leading-snug">{lesson.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Songs */}
        <section className="max-w-5xl mx-auto px-6 py-8 pb-16">
          <h2 className="text-2xl font-black text-zinc-100 mb-6 text-center">Songs You&apos;ll Play</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SONGS.map(song => (
              <div key={song.id} className="flex gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition-all">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-100 text-sm truncate">{song.title}</p>
                  <p className="text-xs text-zinc-500">{song.artist}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {song.chords.map(c => (
                      <span key={c} className="text-xs px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded font-mono">{c}</span>
                    ))}
                  </div>
                  {song.capo > 0 && (
                    <span className="text-xs text-amber-400/80 mt-1 block">Capo {song.capo}</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-zinc-600">{song.bpm} BPM</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`w-1.5 h-3 rounded-sm ${i < song.difficulty ? 'bg-amber-500' : 'bg-zinc-700'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-600">Hour {song.hourUnlock}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800/60 py-6 text-center">
        <p className="text-xs text-zinc-600">
          Built for the 8-hour guitar challenge. Research-based curriculum from Justin Guitar &amp; Fender Play methods.
        </p>
      </footer>
    </div>
  );
}
