'use client';
import type { Chord } from '@/data/chords';

interface Props {
  chord: Chord;
  highlightedStrings?: number[]; // 0-indexed, strings with incorrect notes (shown red)
  size?: 'sm' | 'md' | 'lg';
}

const FINGER_COLORS: Record<number, string> = {
  1: '#3b82f6', // blue — index
  2: '#22c55e', // green — middle
  3: '#f59e0b', // amber — ring
  4: '#ec4899', // pink — pinky
};

const FINGER_LABELS: Record<number, string> = { 1: 'I', 2: 'M', 3: 'R', 4: 'P' };

export default function ChordDiagram({ chord, highlightedStrings = [], size = 'md' }: Props) {
  const pos = chord.positions[0];
  if (!pos) return null;

  const { frets, fingers, baseFret } = pos;
  const numFrets = 5;
  const numStrings = 6;

  const dims = {
    sm: { w: 100, h: 110, strGap: 14, fretGap: 18, r: 6, pad: 14 },
    md: { w: 140, h: 160, strGap: 20, fretGap: 26, r: 9, pad: 20 },
    lg: { w: 180, h: 200, strGap: 26, fretGap: 34, r: 11, pad: 26 },
  }[size];

  const { w, h, strGap, fretGap, r, pad } = dims;
  const gridW = strGap * (numStrings - 1);
  const gridH = fretGap * numFrets;
  const offsetX = (w - gridW) / 2;
  const offsetY = pad + (baseFret > 1 ? 0 : fretGap * 0.5);

  // Find min/max fret used
  const usedFrets = frets.filter(f => f > 0);
  const maxFret = usedFrets.length > 0 ? Math.max(...usedFrets) : 1;
  const displayBaseFret = baseFret > 1 ? baseFret : 1;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-amber-400 font-bold text-sm">{chord.label}</span>
      {baseFret > 1 && (
        <span className="text-xs text-zinc-400">fret {baseFret}</span>
      )}
      <svg width={w} height={h + 10} viewBox={`0 0 ${w} ${h + 10}`}>
        {/* Nut (thick bar at top if baseFret is 1) */}
        {baseFret === 1 && (
          <rect x={offsetX - 2} y={offsetY - 2} width={gridW + 4} height={4} rx={2} fill="#e5e7eb" />
        )}

        {/* Fret lines */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => (
          <line
            key={i}
            x1={offsetX} y1={offsetY + i * fretGap}
            x2={offsetX + gridW} y2={offsetY + i * fretGap}
            stroke="#374151" strokeWidth={1}
          />
        ))}

        {/* String lines */}
        {Array.from({ length: numStrings }).map((_, i) => {
          const x = offsetX + i * strGap;
          const isMuted = frets[i] === -1;
          const isHighlighted = highlightedStrings.includes(i);
          return (
            <line
              key={i}
              x1={x} y1={offsetY}
              x2={x} y2={offsetY + gridH}
              stroke={isHighlighted ? '#ef4444' : isMuted ? '#374151' : '#6b7280'}
              strokeWidth={isHighlighted ? 2 : 1}
            />
          );
        })}

        {/* Barre */}
        {pos.barres.map((barre) => (
          <rect
            key={barre}
            x={offsetX - r}
            y={offsetY + (barre - baseFret) * fretGap + fretGap / 2 - r}
            width={gridW + r * 2}
            height={r * 2}
            rx={r}
            fill="#6366f1"
            opacity={0.85}
          />
        ))}

        {/* Finger dots */}
        {frets.map((fret, stringIdx) => {
          if (fret <= 0) return null;
          const finger = fingers[stringIdx];
          const cx = offsetX + stringIdx * strGap;
          const cy = offsetY + (fret - baseFret) * fretGap + fretGap / 2;
          const isHigh = highlightedStrings.includes(stringIdx);
          return (
            <g key={stringIdx}>
              <circle
                cx={cx} cy={cy} r={r}
                fill={isHigh ? '#ef4444' : (FINGER_COLORS[finger] ?? '#6b7280')}
              />
              {finger > 0 && (
                <text
                  x={cx} y={cy + r * 0.4}
                  textAnchor="middle"
                  fontSize={r * 1.1}
                  fill="white"
                  fontWeight="bold"
                >
                  {FINGER_LABELS[finger]}
                </text>
              )}
            </g>
          );
        })}

        {/* Open / muted indicators above nut */}
        {frets.map((fret, i) => {
          const x = offsetX + i * strGap;
          if (fret === 0) {
            return <circle key={i} cx={x} cy={offsetY - fretGap * 0.5} r={r * 0.7} fill="none" stroke="#9ca3af" strokeWidth={1.5} />;
          }
          if (fret === -1) {
            return (
              <g key={i}>
                <line x1={x - r * 0.6} y1={offsetY - fretGap * 0.5 - r * 0.6} x2={x + r * 0.6} y2={offsetY - fretGap * 0.5 + r * 0.6} stroke="#ef4444" strokeWidth={1.5} />
                <line x1={x + r * 0.6} y1={offsetY - fretGap * 0.5 - r * 0.6} x2={x - r * 0.6} y2={offsetY - fretGap * 0.5 + r * 0.6} stroke="#ef4444" strokeWidth={1.5} />
              </g>
            );
          }
          return null;
        })}
      </svg>

      {/* Finger legend */}
      <div className="flex gap-2 flex-wrap justify-center mt-1">
        {[1,2,3,4].map(f => {
          const used = fingers.includes(f);
          if (!used) return null;
          return (
            <span key={f} className="text-xs px-1.5 py-0.5 rounded" style={{ background: FINGER_COLORS[f] + '33', color: FINGER_COLORS[f] }}>
              {FINGER_LABELS[f]} = {['', 'Index', 'Middle', 'Ring', 'Pinky'][f]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
