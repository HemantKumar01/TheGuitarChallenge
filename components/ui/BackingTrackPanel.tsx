'use client';
import { useSessionStore, type BackingMode } from '@/lib/store/sessionStore';
import { SONGS } from '@/data/songs';
import { useState, useRef, useEffect } from 'react';
import { useMetronome } from '@/hooks/useMetronome';

const MODES: { value: BackingMode; label: string; icon: string; desc: string }[] = [
  { value: 'drums', label: 'Drums', icon: '🥁', desc: 'Pure rhythm — focus on timing' },
  { value: 'instrumental', label: 'Instrumental', icon: '🎹', desc: 'Full band, no vocals' },
  { value: 'full', label: 'Full Track', icon: '🎤', desc: 'Original song via YouTube' },
];

interface Props {
  songId: string;
  bpm: number;
}

export default function BackingTrackPanel({ songId, bpm }: Props) {
  const { backingMode, setBackingMode, practiceSpeed, setPracticeSpeed } = useSessionStore();
  const song = SONGS.find(s => s.id === songId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const effectiveBpm = Math.round(bpm * practiceSpeed);
  const { isPlaying: metronomePlaying, bpm: metronomeBpm, setBpm, toggle: toggleMetronome, currentBeat, beatsPerMeasure } = useMetronome(effectiveBpm);

  useEffect(() => {
    setBpm(effectiveBpm);
  }, [effectiveBpm, setBpm]);

  const handlePlay = () => {
    if (backingMode === 'full') {
      setShowYouTube(true);
      setIsPlaying(true);
    } else {
      toggleMetronome();
      setIsPlaying(!metronomePlaying);
    }
  };

  const handleStop = () => {
    if (metronomePlaying) toggleMetronome();
    setShowYouTube(false);
    setIsPlaying(false);
  };

  if (!song) return null;

  return (
    <div className="flex flex-col gap-3 p-4 bg-zinc-900/80 border border-zinc-800 rounded-xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-300">Backing Track</span>
        <span className="text-xs text-zinc-500">{effectiveBpm} BPM</span>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-1.5">
        {MODES.map(m => (
          <button
            key={m.value}
            onClick={() => { setBackingMode(m.value); handleStop(); }}
            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs transition-all border ${
              backingMode === m.value
                ? 'border-amber-500/60 bg-amber-500/10 text-amber-400'
                : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:border-zinc-600'
            }`}
          >
            <span className="text-lg">{m.icon}</span>
            <span className="font-medium">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Mode description */}
      <p className="text-xs text-zinc-500 text-center">
        {MODES.find(m => m.value === backingMode)?.desc}
      </p>

      {/* Speed control */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Practice Speed</span>
          <span className="text-amber-400 font-medium">{Math.round(practiceSpeed * 100)}%</span>
        </div>
        <input
          type="range" min={40} max={100} step={5}
          value={Math.round(practiceSpeed * 100)}
          onChange={e => setPracticeSpeed(Number(e.target.value) / 100)}
          className="w-full accent-amber-400"
        />
        <div className="flex justify-between text-xs text-zinc-700">
          <span>40% (very slow)</span>
          <span>100% (full speed)</span>
        </div>
      </div>

      {/* Beat visualizer for drums mode */}
      {backingMode === 'drums' && metronomePlaying && (
        <div className="flex gap-1.5 justify-center">
          {Array.from({ length: beatsPerMeasure }).map((_, i) => (
            <div
              key={i}
              className={`h-5 w-8 rounded transition-all duration-75 ${
                currentBeat === i
                  ? i === 0 ? 'bg-amber-400 shadow-amber-400/50 shadow-md' : 'bg-amber-600'
                  : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>
      )}

      {/* Play/Stop */}
      {backingMode !== 'full' ? (
        <button
          onClick={metronomePlaying ? handleStop : handlePlay}
          className={`py-2 rounded-lg font-bold text-sm transition-all ${
            metronomePlaying
              ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
              : 'bg-amber-500 text-black hover:bg-amber-400'
          }`}
        >
          {metronomePlaying ? '⏹ Stop' : '▶ Start Backing'}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowYouTube(!showYouTube)}
            className="py-2 rounded-lg font-bold text-sm bg-red-600 hover:bg-red-500 text-white transition-all flex items-center justify-center gap-2"
          >
            <span>▶</span> Open YouTube
          </button>
          {showYouTube && song.youtubeId && (
            <div className="rounded-lg overflow-hidden border border-zinc-700 aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${song.youtubeId}?autoplay=0&controls=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
          <p className="text-xs text-zinc-500 text-center">Play along with the original recording</p>
        </div>
      )}
    </div>
  );
}
