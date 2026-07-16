export interface ChordPosition {
  frets: number[]; // 6 strings, low E to high e; -1 = muted, 0 = open
  fingers: number[]; // 0 = no finger, 1-4 = finger number
  baseFret: number;
  barres: number[];
  midi: number[];
}

export interface Chord {
  key: string;
  suffix: string;
  label: string;
  positions: ChordPosition[];
}

export const CHORDS: Record<string, Chord> = {
  Em: {
    key: 'E',
    suffix: 'minor',
    label: 'Em',
    positions: [
      {
        frets: [0, 2, 2, 0, 0, 0],
        fingers: [0, 2, 3, 0, 0, 0],
        baseFret: 1,
        barres: [],
        midi: [40, 47, 52, 55, 59, 64],
      },
    ],
  },
  E: {
    key: 'E',
    suffix: 'major',
    label: 'E',
    positions: [
      {
        frets: [0, 2, 2, 1, 0, 0],
        fingers: [0, 2, 3, 1, 0, 0],
        baseFret: 1,
        barres: [],
        midi: [40, 47, 52, 56, 59, 64],
      },
    ],
  },
  Am: {
    key: 'A',
    suffix: 'minor',
    label: 'Am',
    positions: [
      {
        frets: [-1, 0, 2, 2, 1, 0],
        fingers: [0, 0, 3, 2, 1, 0],
        baseFret: 1,
        barres: [],
        midi: [45, 52, 57, 60, 64],
      },
    ],
  },
  A: {
    key: 'A',
    suffix: 'major',
    label: 'A',
    positions: [
      {
        frets: [-1, 0, 2, 2, 2, 0],
        fingers: [0, 0, 1, 2, 3, 0],
        baseFret: 1,
        barres: [],
        midi: [45, 52, 57, 61, 64],
      },
    ],
  },
  G: {
    key: 'G',
    suffix: 'major',
    label: 'G',
    positions: [
      {
        frets: [3, 2, 0, 0, 0, 3],
        fingers: [2, 1, 0, 0, 0, 3],
        baseFret: 1,
        barres: [],
        midi: [43, 47, 52, 55, 59, 67],
      },
    ],
  },
  C: {
    key: 'C',
    suffix: 'major',
    label: 'C',
    positions: [
      {
        frets: [-1, 3, 2, 0, 1, 0],
        fingers: [0, 3, 2, 0, 1, 0],
        baseFret: 1,
        barres: [],
        midi: [48, 52, 55, 60, 64],
      },
    ],
  },
  D: {
    key: 'D',
    suffix: 'major',
    label: 'D',
    positions: [
      {
        frets: [-1, -1, 0, 2, 3, 2],
        fingers: [0, 0, 0, 1, 3, 2],
        baseFret: 1,
        barres: [],
        midi: [50, 57, 62, 66],
      },
    ],
  },
  Dm: {
    key: 'D',
    suffix: 'minor',
    label: 'Dm',
    positions: [
      {
        frets: [-1, -1, 0, 2, 3, 1],
        fingers: [0, 0, 0, 2, 3, 1],
        baseFret: 1,
        barres: [],
        midi: [50, 57, 62, 65],
      },
    ],
  },
  Em7: {
    key: 'E',
    suffix: 'minor7',
    label: 'Em7',
    positions: [
      {
        frets: [0, 2, 2, 0, 3, 3],
        fingers: [0, 2, 3, 0, 4, 4],
        baseFret: 1,
        barres: [],
        midi: [40, 47, 52, 55, 62, 67],
      },
    ],
  },
  Dsus4: {
    key: 'D',
    suffix: 'sus4',
    label: 'Dsus4',
    positions: [
      {
        frets: [-1, -1, 0, 2, 3, 3],
        fingers: [0, 0, 0, 1, 3, 4],
        baseFret: 1,
        barres: [],
        midi: [50, 57, 62, 67],
      },
    ],
  },
  A7sus4: {
    key: 'A',
    suffix: '7sus4',
    label: 'A7sus4',
    positions: [
      {
        frets: [-1, 0, 2, 0, 3, 3],
        fingers: [0, 0, 2, 0, 3, 4],
        baseFret: 1,
        barres: [],
        midi: [45, 52, 55, 62, 67],
      },
    ],
  },
  Cadd9: {
    key: 'C',
    suffix: 'add9',
    label: 'Cadd9',
    positions: [
      {
        frets: [-1, 3, 2, 0, 3, 3],
        fingers: [0, 3, 2, 0, 4, 4],
        baseFret: 1,
        barres: [],
        midi: [48, 52, 55, 60, 67],
      },
    ],
  },
  B7: {
    key: 'B',
    suffix: '7',
    label: 'B7',
    positions: [
      {
        frets: [-1, 2, 1, 2, 0, 2],
        fingers: [0, 2, 1, 3, 0, 4],
        baseFret: 1,
        barres: [],
        midi: [47, 54, 57, 59, 63],
      },
    ],
  },
  D6add9: {
    key: 'D',
    suffix: '6add9',
    label: 'D6add9',
    positions: [
      {
        frets: [2, -1, 0, 2, 0, 0],
        fingers: [2, 0, 0, 3, 0, 0],
        baseFret: 1,
        barres: [],
        midi: [42, 50, 54, 57, 62],
      },
    ],
  },
};

export type ChordName = keyof typeof CHORDS;
