'use client';
import { useRouter } from 'next/navigation';
import GuitarTuner from '@/components/ui/GuitarTuner';
import { useSessionStore } from '@/lib/store/sessionStore';
import Link from 'next/link';

export default function TunePage() {
  const router = useRouter();
  const { startSession } = useSessionStore();

  const handleTuned = () => {
    startSession();
    router.push('/session/0');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col">
      <header className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl group-hover:rotate-12 transition-transform">🎸</span>
          <span className="text-sm font-bold text-zinc-400">8-Hour Challenge</span>
        </Link>
        <span className="text-xs text-zinc-600">Step 1 of 2 — Tune your guitar</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 gap-8">
        {/* Header */}
        <div className="text-center max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-medium mb-4">
            Pre-session setup
          </div>
          <h1 className="text-3xl font-black text-zinc-100 mb-2">Tune Your Guitar</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Pluck each open string one at a time. Hold the note steady until the indicator confirms it&apos;s in tune.
            The challenge timer won&apos;t start until you&apos;re ready.
          </p>
        </div>

        {/* Tuning instructions */}
        <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">How to tune</h3>
          <ol className="flex flex-col gap-2">
            {[
              'Click "Enable Microphone" and allow mic access',
              'Pluck one open string and let it ring — hold it steady',
              'Watch the needle. Turn the tuning peg: clockwise = tighten (pitch goes up), counter-clockwise = loosen (pitch goes down)',
              'When the needle centres and the string turns green, move to the next string',
              'Tune all 6 strings low to high: E A D G B e',
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-xs text-zinc-400 leading-relaxed">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* The tuner itself */}
        <GuitarTuner onAllTuned={handleTuned} />
      </main>
    </div>
  );
}
