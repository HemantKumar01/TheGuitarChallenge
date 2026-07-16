import ChallengeTimer from '@/components/ui/ChallengeTimer';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { CURRICULUM } from '@/data/curriculum';

export default function SessionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0a0a0b]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">🎸</span>
            <span className="text-sm font-bold text-zinc-200 hidden sm:block">8-Hour Challenge</span>
          </Link>

          {/* Hour navigation */}
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {CURRICULUM.map((lesson, i) => (
              <Link
                key={i}
                href={`/session/${lesson.hour}`}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition-all hover:bg-zinc-800"
              >
                <span>{lesson.icon}</span>
                <span className="hidden md:block text-zinc-400">{lesson.title}</span>
                <span className="md:hidden text-zinc-400">{lesson.hour + 1}</span>
              </Link>
            ))}
          </div>

          {/* Timer */}
          <div className="flex-shrink-0">
            <ChallengeTimer />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
