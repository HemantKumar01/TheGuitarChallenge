'use client';
import { useSessionStore } from '@/lib/store/sessionStore';
import { analyzeMistakes } from '@/lib/analysis/mistakeAnalysis';
import { useEffect } from 'react';

export default function SideQuestPanel() {
  const { mistakes, sideQuests, setSideQuests, completeSideQuest } = useSessionStore();

  // Re-analyze whenever mistakes accumulate
  useEffect(() => {
    if (mistakes.length > 0 && mistakes.length % 5 === 0) {
      const quests = analyzeMistakes(mistakes);
      if (quests.length > 0) setSideQuests(quests);
    }
  }, [mistakes, setSideQuests]);

  const pending = sideQuests.filter(q => !q.completed);
  const done = sideQuests.filter(q => q.completed);

  if (sideQuests.length === 0) {
    return (
      <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">⚡</span>
          <span className="text-sm font-semibold text-zinc-300">Side Quests</span>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Practice with your microphone enabled — the app will detect common mistakes and generate personalized drills for you here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <span className="text-sm font-semibold text-zinc-300">Side Quests</span>
        </div>
        {done.length > 0 && (
          <span className="text-xs text-green-400">{done.length} done</span>
        )}
      </div>

      {done.length >= 3 && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          🎸 Bonus unlocked! You cleared 3 side quests — check Hour 8 for a bonus song.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {pending.map(quest => (
          <div key={quest.id} className="p-3 bg-zinc-800/60 border border-zinc-700/60 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    quest.priority >= 9 ? 'bg-red-500/20 text-red-400' :
                    quest.priority >= 7 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-zinc-700 text-zinc-400'
                  }`}>
                    {quest.priority >= 9 ? 'Urgent' : quest.priority >= 7 ? 'High' : 'Normal'}
                  </span>
                  <span className="text-xs text-zinc-500">{quest.durationMinutes} min</span>
                </div>
                <p className="text-sm font-medium text-zinc-200 mb-1">{quest.title}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{quest.instruction}</p>
              </div>
            </div>
            <button
              onClick={() => completeSideQuest(quest.id)}
              className="mt-2 w-full text-xs py-1.5 rounded bg-zinc-700 hover:bg-green-600 text-zinc-300 hover:text-white transition-all"
            >
              Mark Complete ✓
            </button>
          </div>
        ))}

        {done.map(quest => (
          <div key={quest.id} className="p-3 bg-zinc-900/40 border border-zinc-800/40 rounded-lg opacity-60">
            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm">✓</span>
              <span className="text-sm text-zinc-400 line-through">{quest.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
