export type MistakeType =
  | 'finger-pressure'  // low clarity on specific string
  | 'intonation-flat'  // consistently flat
  | 'intonation-sharp' // consistently sharp
  | 'timing-late'      // notes consistently late
  | 'timing-early'     // notes consistently early
  | 'string-mute'      // string not ringing at all
  | 'wrong-note'       // consistently wrong note on specific fret
  | 'chord-transition' // slow/missing transitions

export interface MistakeEvent {
  id: string;
  type: MistakeType;
  timestamp: number;
  chordOrNote: string;
  string?: number;   // 1-6
  fret?: number;
  centsOff?: number;
  timingMsOff?: number;
  clarity?: number;
}

export interface SideQuest {
  id: string;
  title: string;
  description: string;
  instruction: string;
  durationMinutes: number;
  priority: number; // higher = more important
  completed: boolean;
  exerciseType: 'chord-hold' | 'chord-transition' | 'single-note' | 'timing-drill';
  targetChord?: string;
  targetBpm?: number;
}

export function analyzeMistakes(mistakes: MistakeEvent[]): SideQuest[] {
  if (mistakes.length === 0) return [];
  const quests: SideQuest[] = [];
  const now = Date.now();

  // Group by type
  const byType = mistakes.reduce<Record<MistakeType, MistakeEvent[]>>((acc, m) => {
    if (!acc[m.type]) acc[m.type] = [];
    acc[m.type].push(m);
    return acc;
  }, {} as Record<MistakeType, MistakeEvent[]>);

  // Finger pressure issues (low clarity on a repeated string)
  if ((byType['finger-pressure']?.length ?? 0) >= 3) {
    const strings = byType['finger-pressure'].map(m => m.string).filter(Boolean);
    const mostCommonString = mostFrequent(strings as number[]);
    quests.push({
      id: `sq-pressure-${now}`,
      title: 'Finger Pressure Drill',
      description: `You keep getting a muffled sound on string ${mostCommonString}`,
      instruction: `Press your finger firmly on string ${mostCommonString}, just behind the fretwire. Apply minimum pressure until it rings clear. Repeat 20 times slowly.`,
      durationMinutes: 3,
      priority: 9,
      completed: false,
      exerciseType: 'single-note',
    });
  }

  // Intonation — flat
  if ((byType['intonation-flat']?.length ?? 0) >= 3) {
    const avgCents = average(byType['intonation-flat'].map(m => m.centsOff ?? 0));
    quests.push({
      id: `sq-flat-${now}`,
      title: 'Intonation Fix — Move Finger Forward',
      description: `Playing consistently ${Math.abs(Math.round(avgCents))}¢ flat`,
      instruction: 'Slide your fretting finger slightly closer to the fretwire (toward the soundhole). Even 2mm makes a big difference. Re-check with the tuner.',
      durationMinutes: 2,
      priority: 8,
      completed: false,
      exerciseType: 'single-note',
    });
  }

  // Intonation — sharp
  if ((byType['intonation-sharp']?.length ?? 0) >= 3) {
    quests.push({
      id: `sq-sharp-${now}`,
      title: 'Intonation Fix — Ease Finger Pressure',
      description: 'Playing consistently sharp — over-pressing bends the string slightly sharp',
      instruction: 'Reduce fretting pressure until you find the minimum that produces a clean note. Press straight down — do not pull the string toward you.',
      durationMinutes: 2,
      priority: 7,
      completed: false,
      exerciseType: 'single-note',
    });
  }

  // Timing issues
  if ((byType['timing-late']?.length ?? 0) >= 4) {
    quests.push({
      id: `sq-timing-${now}`,
      title: 'Timing Drill — 50% BPM',
      description: 'Notes landing late — chord changes need anticipation',
      instruction: 'Practice the same exercise at half speed with the metronome. Aim to have your fingers in position BEFORE the beat, not on it. Think "beat minus one."',
      durationMinutes: 5,
      priority: 8,
      completed: false,
      exerciseType: 'timing-drill',
      targetBpm: 50,
    });
  }

  // String muting during chord transitions
  if ((byType['string-mute']?.length ?? 0) >= 3) {
    const chords = byType['string-mute'].map(m => m.chordOrNote).filter(Boolean);
    const problemChord = mostFrequent(chords);
    quests.push({
      id: `sq-mute-${now}`,
      title: `Chord Clarity: ${problemChord}`,
      description: `Strings muting when playing ${problemChord}`,
      instruction: `Place the ${problemChord} chord slowly. Pick each string individually — find which string is muted. Adjust the offending finger so it doesn't touch adjacent strings. Repeat 15 times.`,
      durationMinutes: 4,
      priority: 9,
      completed: false,
      exerciseType: 'chord-hold',
      targetChord: problemChord,
    });
  }

  // Chord transition issues
  if ((byType['chord-transition']?.length ?? 0) >= 3) {
    const chords = byType['chord-transition'].map(m => m.chordOrNote);
    const problemPair = mostFrequent(chords);
    quests.push({
      id: `sq-transition-${now}`,
      title: `Transition Drill: ${problemPair}`,
      description: `Slow transitions detected for ${problemPair}`,
      instruction: `Do One Minute Changes for ${problemPair}: switch as many times as possible in 60 seconds. Track your count. Target: 30 clean changes per minute.`,
      durationMinutes: 5,
      priority: 10,
      completed: false,
      exerciseType: 'chord-transition',
      targetChord: problemPair,
    });
  }

  return quests.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

function mostFrequent<T>(arr: T[]): T {
  const freq = new Map<T, number>();
  for (const item of arr) freq.set(item, (freq.get(item) ?? 0) + 1);
  let max = 0;
  let result = arr[0];
  for (const [item, count] of freq) {
    if (count > max) { max = count; result = item; }
  }
  return result;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
