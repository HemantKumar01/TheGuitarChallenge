const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface DetectedNote {
  name: string;   // e.g. "E"
  octave: number; // e.g. 2
  label: string;  // e.g. "E2"
  midi: number;   // MIDI note number
  centsOff: number; // deviation from exact pitch (-50 to +50)
  frequency: number;
}

export function freqToNote(frequency: number): DetectedNote {
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const roundedMidi = Math.round(midi);
  const centsOff = Math.round((midi - roundedMidi) * 100);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  const name = NOTE_NAMES[noteIndex];
  return { name, octave, label: `${name}${octave}`, midi: roundedMidi, centsOff, frequency };
}

export function noteToFreq(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)(\d)$/);
  if (!match) return 0;
  const noteIndex = NOTE_NAMES.indexOf(match[1]);
  const octave = parseInt(match[2]);
  const midi = (octave + 1) * 12 + noteIndex;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function isNoteMatch(detected: DetectedNote, target: string, toleranceCents = 50): boolean {
  const targetNote = target.replace(/\d/, '');
  if (detected.name !== targetNote) return false;
  return Math.abs(detected.centsOff) <= toleranceCents;
}

export function isNoteMatchLoose(detected: DetectedNote, targets: string[]): { match: boolean; closest: string; centsOff: number } {
  let closest = targets[0];
  let minDiff = Infinity;
  for (const t of targets) {
    const targetFreq = noteToFreq(t);
    if (targetFreq === 0) continue;
    const diff = Math.abs(detected.frequency - targetFreq);
    if (diff < minDiff) {
      minDiff = diff;
      closest = t;
    }
  }
  const targetFreq = noteToFreq(closest);
  const cents = targetFreq > 0 ? Math.round(1200 * Math.log2(detected.frequency / targetFreq)) : 999;
  return { match: Math.abs(cents) <= 50, closest, centsOff: cents };
}

export function getFeedbackColor(centsOff: number): 'green' | 'yellow' | 'red' {
  const abs = Math.abs(centsOff);
  if (abs <= 20) return 'green';
  if (abs <= 50) return 'yellow';
  return 'red';
}

export function getFeedbackLabel(centsOff: number): string {
  if (Math.abs(centsOff) <= 20) return 'Perfect!';
  if (centsOff > 20) return `${centsOff}¢ sharp — tune down slightly`;
  return `${Math.abs(centsOff)}¢ flat — tune up slightly`;
}
