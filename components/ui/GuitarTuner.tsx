'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// Standard tuning
const STRINGS = [
  { name: 'E2', label: '6 — Low E',  freq: 82.41,  color: 'from-red-500 to-red-600' },
  { name: 'A2', label: '5 — A',      freq: 110.00, color: 'from-orange-500 to-orange-600' },
  { name: 'D3', label: '4 — D',      freq: 146.83, color: 'from-yellow-500 to-yellow-600' },
  { name: 'G3', label: '3 — G',      freq: 196.00, color: 'from-green-500 to-green-600' },
  { name: 'B3', label: '2 — B',      freq: 246.94, color: 'from-cyan-500 to-cyan-600' },
  { name: 'E4', label: '1 — High e', freq: 329.63, color: 'from-violet-500 to-violet-600' },
];

// 8192 samples at 44100 Hz = ~186ms per analysis window (~15 cycles of low E at 82 Hz)
const ANALYSIS_SIZE = 8192;
// ScriptProcessor fires every 4096 samples; we accumulate two buffers before analysing
const PROCESSOR_SIZE = 4096;
// Median over the last N valid frequency readings to kill octave-flip noise
const MEDIAN_WINDOW = 7;
// Require RMS above this to ignore silent/decaying frames
const MIN_RMS = 0.003;
// Clarity threshold — relaxed slightly vs exercise detector because thick strings have
// richer harmonics that can push pitchy's clarity score lower even when correct
const MIN_CLARITY = 0.80;

function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Find which open string is closest to freq (in cents)
function closestString(freq: number) {
  let best = STRINGS[0];
  let bestCents = Infinity;
  for (const s of STRINGS) {
    const c = Math.abs(1200 * Math.log2(freq / s.freq));
    if (c < bestCents) { bestCents = c; best = s; }
  }
  return { string: best, cents: Math.round(1200 * Math.log2(freq / best.freq)) };
}

interface StringState { tuned: boolean; lastCents: number | null; }

interface TunerReading {
  string: typeof STRINGS[0];
  cents: number;         // smoothed
  rawFreq: number;       // for display debugging
}

export default function GuitarTuner({ onAllTuned }: { onAllTuned: () => void }) {
  const [isActive, setIsActive] = useState(false);
  const [isSupported] = useState(() =>
    typeof window !== 'undefined' && 'AudioContext' in window && 'getUserMedia' in (navigator.mediaDevices ?? {})
  );
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<TunerReading | null>(null);
  const [signalLevel, setSignalLevel] = useState(0); // 0-1 RMS for debug bar
  const [stringStates, setStringStates] = useState<Record<string, StringState>>(
    Object.fromEntries(STRINGS.map(s => [s.name, { tuned: false, lastCents: null }]))
  );

  // Audio refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  // Accumulation ring buffer — slides a 8192-sample window from two 4096-sample chunks
  const accumBufRef = useRef(new Float32Array(ANALYSIS_SIZE));
  // Sliding median window — raw frequencies (not cents, to handle log-space correctly)
  const freqHistoryRef = useRef<number[]>([]);
  // Stable-count for per-string confirmation
  const stableRef = useRef<{ string: string; count: number }>({ string: '', count: 0 });
  // EMA state for smooth needle (display only)
  const emaCentsRef = useRef<number | null>(null);

  const tunedCount = Object.values(stringStates).filter(s => s.tuned).length;
  const allTuned = tunedCount === STRINGS.length;

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setIsActive(false);
    setReading(null);
  }, []);

  const start = useCallback(async () => {
    if (isActive) return;
    setError(null);
    try {
      const { PitchDetector } = await import('pitchy');

      // getUserMedia first — keeps us inside the user-gesture activation window
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      // AudioContext starts suspended on many browsers — must resume explicitly
      await audioCtx.resume();

      const source = audioCtx.createMediaStreamSource(stream);

      // Detector sized to ANALYSIS_SIZE so pitchy sees a full 8192-sample window
      const detector = PitchDetector.forFloat32Array(ANALYSIS_SIZE);

      const processor = audioCtx.createScriptProcessor(PROCESSOR_SIZE, 1, 1);
      processorRef.current = processor;

      // Track how many chunks we've received so we fill the ring buffer before analysing
      let chunksReceived = 0;

      processor.onaudioprocess = (e) => {
        const chunk = e.inputBuffer.getChannelData(0);
        chunksReceived++;

        // Slide the ring buffer left by one chunk and append the new chunk at the end
        accumBufRef.current.copyWithin(0, PROCESSOR_SIZE);
        accumBufRef.current.set(chunk, PROCESSOR_SIZE);

        // Don't analyse until the buffer has been fully populated (2 chunks)
        if (chunksReceived < 2) return;

        const buf = accumBufRef.current;
        const currentRms = rms(buf);
        setSignalLevel(Math.min(1, currentRms / 0.05)); // scale for display

        // Gate on signal level — don't detect on silence or decay tail
        if (currentRms < MIN_RMS) {
          emaCentsRef.current = null;
          setReading(null);
          return;
        }

        const [rawFreq, clarity] = detector.findPitch(buf, audioCtx.sampleRate);

        if (clarity < MIN_CLARITY || rawFreq < 70 || rawFreq > 400) return;

        // ── Octave-error correction ──────────────────────────────────────────
        // Pitchy sometimes returns 2× (or ½×) the true fundamental.
        // Strategy: compare rawFreq against the history median. If it's ~1 octave
        // away from the median, try the sub-octave (rawFreq/2) and see if that fits
        // a string better.
        let freq = rawFreq;
        const history = freqHistoryRef.current;
        if (history.length >= 3) {
          const med = median(history);
          const octaveRatio = freq / med;
          // If the new reading is ~2× the history median → likely octave error
          if (octaveRatio > 1.7 && octaveRatio < 2.3) {
            const subOctave = freq / 2;
            const { cents: cSub } = closestString(subOctave);
            const { cents: cRaw } = closestString(freq);
            if (Math.abs(cSub) < Math.abs(cRaw)) freq = subOctave;
          }
        }

        // ── Median smoothing ─────────────────────────────────────────────────
        // Keep a fixed-length window of raw frequencies (in Hz, not cents — median
        // in Hz is more natural than in log-space for this purpose)
        freqHistoryRef.current = [...history.slice(-(MEDIAN_WINDOW - 1)), freq];
        if (freqHistoryRef.current.length < 3) return; // wait for enough history

        const smoothFreq = median(freqHistoryRef.current);
        const { string, cents } = closestString(smoothFreq);

        // ── EMA for the needle display (purely cosmetic) ──────────────────────
        const EMA_ALPHA = 0.35; // lower = smoother but more lag
        if (emaCentsRef.current === null) {
          emaCentsRef.current = cents;
        } else {
          emaCentsRef.current = EMA_ALPHA * cents + (1 - EMA_ALPHA) * emaCentsRef.current;
        }
        const displayCents = Math.round(emaCentsRef.current);

        setReading({ string, cents: displayCents, rawFreq: smoothFreq });

        // Update per-string lastCents immediately (before stable check)
        setStringStates(prev => ({
          ...prev,
          [string.name]: prev[string.name].tuned
            ? prev[string.name]
            : { ...prev[string.name], lastCents: displayCents },
        }));

        // ── Stable-count confirmation ─────────────────────────────────────────
        // Require IN_TUNE_COUNT consecutive in-tune readings on the SAME string
        const IN_TUNE_THRESHOLD = 8;  // ¢
        const CONFIRM_FRAMES = 8;     // ~8 × 93ms ≈ 0.75 s of steady in-tune signal

        if (Math.abs(cents) <= IN_TUNE_THRESHOLD) {
          if (stableRef.current.string === string.name) {
            stableRef.current.count += 1;
          } else {
            stableRef.current = { string: string.name, count: 1 };
          }
          if (stableRef.current.count >= CONFIRM_FRAMES) {
            setStringStates(prev => {
              if (prev[string.name].tuned) return prev;
              return { ...prev, [string.name]: { tuned: true, lastCents: displayCents } };
            });
            stableRef.current = { string: '', count: 0 };
          }
        } else {
          if (stableRef.current.string === string.name) {
            stableRef.current.count = 0;
          }
        }
      };

      source.connect(processor);
      // ScriptProcessorNode only fires onaudioprocess when the graph reaches destination.
      // Use a silent gain node (volume 0) so nothing is audible but the callback fires.
      const silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      setIsActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
      stop();
    }
  }, [isActive, stop]);

  useEffect(() => () => { stop(); }, [stop]);

  // ── Derived display values ────────────────────────────────────────────────
  const cents = reading?.cents ?? null;
  const activeString = reading?.string ?? null;
  const inTune     = cents !== null && Math.abs(cents) <= 8;
  const slightlyOff = cents !== null && Math.abs(cents) > 8 && Math.abs(cents) <= 25;
  const needleAngle = cents !== null ? Math.max(-70, Math.min(70, cents * 1.4)) : 0;
  const needleColor = !activeString ? '#52525b'
    : inTune ? '#22c55e' : slightlyOff ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">

      {/* ── Needle dial ─────────────────────────────────────────────────── */}
      <div className="relative w-72 h-44 select-none">
        <svg viewBox="0 0 288 160" className="w-full h-full" style={{ overflow: 'visible' }}>
          {/* Background arc */}
          <path d="M 24 140 A 120 120 0 0 1 264 140"
            fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
          {/* Green zone (±8¢) */}
          <path d="M 137 21 A 120 120 0 0 1 151 21"
            fill="none" stroke="#166534" strokeWidth="10" strokeLinecap="round" />

          {/* Tick marks */}
          {[-50, -25, 0, 25, 50].map(c => {
            const a = (c / 50) * 70 * (Math.PI / 180);
            const cx = 144 + 120 * Math.sin(a), cy = 140 - 120 * Math.cos(a);
            const ix = 144 + 106 * Math.sin(a), iy = 140 - 106 * Math.cos(a);
            return (
              <g key={c}>
                <line x1={ix} y1={iy} x2={cx} y2={cy}
                  stroke={c === 0 ? '#22c55e' : '#3f3f46'}
                  strokeWidth={c === 0 ? 2.5 : 1} />
                <text x={cx + Math.sin(a) * 15} y={cy - Math.cos(a) * 15}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="9" fill={c === 0 ? '#4ade80' : '#52525b'}>
                  {c === 0 ? '0' : `${c > 0 ? '+' : ''}${c}`}
                </text>
              </g>
            );
          })}

          {/* Needle — CSS transition gives smooth EMA motion */}
          <g style={{
            transform: `rotate(${needleAngle}deg)`,
            transformOrigin: '144px 140px',
            transition: 'transform 120ms ease-out',
          }}>
            <line x1="144" y1="140" x2="144" y2="28"
              stroke={needleColor} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="144" cy="28" r="4.5" fill={needleColor} />
          </g>

          <circle cx="144" cy="140" r="6" fill="#3f3f46" />
          <circle cx="144" cy="140" r="3" fill="#71717a" />
        </svg>

        {/* Cents + direction */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-0.5">
          {isActive && activeString ? (
            <>
              <span className={`text-3xl font-black font-mono tabular-nums ${
                inTune ? 'text-green-400' : slightlyOff ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {cents !== null ? (cents > 0 ? `+${cents}` : `${cents}`) : '—'}¢
              </span>
              <span className="text-xs text-zinc-500">
                {inTune ? '✓ In tune' : cents! > 0 ? '▼ Tune down (loosen peg)' : '▲ Tune up (tighten peg)'}
              </span>
            </>
          ) : (
            <span className="text-sm text-zinc-600">
              {isActive ? 'Pluck a string…' : 'Enable mic to start'}
            </span>
          )}
        </div>
      </div>

      {/* ── Detected string badge ─────────────────────────────────────────── */}
      <div className="h-9 flex items-center justify-center">
        {isActive && activeString ? (
          <div className={`px-5 py-1.5 rounded-full text-sm font-bold bg-gradient-to-r ${activeString.color} text-white shadow-lg transition-all`}>
            Detecting: String {activeString.label}
          </div>
        ) : (
          <div className="px-5 py-1.5 rounded-full text-sm text-zinc-600 border border-zinc-800">
            No signal
          </div>
        )}
      </div>

      {/* ── Per-string grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-6 gap-2 w-full">
        {STRINGS.map(s => {
          const state = stringStates[s.name];
          const isCurrent = isActive && activeString?.name === s.name;
          const c = state.lastCents;
          const cellInTune = c !== null && Math.abs(c) <= 8;
          const cellOff    = c !== null && Math.abs(c) > 8 && Math.abs(c) <= 25;
          return (
            <div key={s.name} className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-150 ${
              state.tuned
                ? 'border-green-500/60 bg-green-500/10'
                : isCurrent
                ? 'border-amber-400/60 bg-amber-500/10 scale-105'
                : 'border-zinc-700/60 bg-zinc-900/40'
            }`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br ${s.color} ${
                state.tuned ? 'opacity-100' : isCurrent ? 'opacity-80' : 'opacity-30'
              }`}>
                {state.tuned ? '✓' : s.name.replace(/\d/, '')}
              </div>
              <span className={`text-xs font-mono transition-colors ${
                state.tuned   ? 'text-green-400' :
                isCurrent     ? (cellInTune ? 'text-green-400' : cellOff ? 'text-yellow-400' : 'text-red-400') :
                'text-zinc-600'
              }`}>
                {state.tuned ? '+0¢' : c !== null ? `${c > 0 ? '+' : ''}${c}¢` : '—'}
              </span>
              <span className="text-xs text-zinc-600 leading-none">{s.name}</span>
            </div>
          );
        })}
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
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

      {/* ── Mic button / status ──────────────────────────────────────────── */}
      {!isActive ? (
        <button onClick={start} disabled={!isSupported}
          className="px-8 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 transition-all disabled:opacity-40">
          🎤 Enable Microphone
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Listening — pluck a string and hold it steady until it turns green
          </div>
          {/* Signal level bar — shows mic is working even before a note is detected */}
          <div className="w-full flex items-center gap-2">
            <span className="text-xs text-zinc-600 w-10 flex-shrink-0">Signal</span>
            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-75"
                style={{
                  width: `${signalLevel * 100}%`,
                  background: signalLevel > 0.15 ? '#22c55e' : signalLevel > 0.02 ? '#eab308' : '#52525b',
                }}
              />
            </div>
            <span className="text-xs text-zinc-600 w-8 text-right flex-shrink-0">
              {signalLevel > 0.02 ? '🎵' : '—'}
            </span>
          </div>
          {signalLevel < 0.02 && (
            <p className="text-xs text-zinc-600 text-center">
              No signal detected — pluck a string loudly, or check mic permissions in browser settings
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400 text-center max-w-xs">{error}</p>}

      {/* ── CTA once all tuned ───────────────────────────────────────────── */}
      {allTuned && (
        <button onClick={() => { stop(); onAllTuned(); }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-lg hover:from-amber-400 hover:to-orange-400 transition-all shadow-xl animate-pulse">
          🎸 Guitar Tuned — Start the Challenge!
        </button>
      )}

      <button onClick={() => { stop(); onAllTuned(); }}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2">
        Skip tuning (already in tune)
      </button>
    </div>
  );
}
