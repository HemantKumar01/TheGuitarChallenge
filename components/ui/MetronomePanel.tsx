'use client';
import { useMetronome } from '@/hooks/useMetronome';

interface Props {
  initialBpm?: number;
}

export default function MetronomePanel({ initialBpm = 80 }: Props) {
  const { isPlaying, bpm, currentBeat, beatsPerMeasure, setBpm, setBeatsPerMeasure, toggle } = useMetronome(initialBpm);

  return (
    <div className="flex flex-col gap-3 p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-300">Metronome</span>
        <button
          onClick={toggle}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
            isPlaying
              ? 'bg-amber-500 text-black hover:bg-amber-400'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
          }`}
        >
          {isPlaying ? '⏹ Stop' : '▶ Start'}
        </button>
      </div>

      {/* Beat visualizer */}
      <div className="flex gap-2 justify-center">
        {Array.from({ length: beatsPerMeasure }).map((_, i) => (
          <div
            key={i}
            className={`h-6 rounded transition-all duration-75 ${
              isPlaying && currentBeat === i
                ? i === 0
                  ? 'bg-amber-400 shadow-lg shadow-amber-400/50 scale-110'
                  : 'bg-amber-600 scale-105'
                : 'bg-zinc-700'
            }`}
            style={{ width: `${80 / beatsPerMeasure}px` }}
          />
        ))}
      </div>

      {/* BPM control */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">BPM</span>
          <span className="text-lg font-mono font-bold text-amber-400">{bpm}</span>
        </div>
        <input
          type="range"
          min={20} max={200} step={1}
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full accent-amber-400"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>20</span>
          <span>Slow (60)</span>
          <span>Medium (100)</span>
          <span>200</span>
        </div>
      </div>

      {/* Quick BPM buttons */}
      <div className="flex gap-2 flex-wrap">
        {[50, 60, 70, 80, 90, 100, 120].map(b => (
          <button
            key={b}
            onClick={() => setBpm(b)}
            className={`text-xs px-2 py-1 rounded transition-all ${
              bpm === b
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {/* Time signature */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Beats</span>
        {[3, 4, 6].map(n => (
          <button
            key={n}
            onClick={() => setBeatsPerMeasure(n)}
            className={`text-xs px-2.5 py-1 rounded transition-all ${
              beatsPerMeasure === n
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            {n}/4
          </button>
        ))}
      </div>
    </div>
  );
}
