import type { ChordName } from './chords';

export interface SongChordChange {
  chord: ChordName;
  beat: number; // beat number in the measure (1-indexed)
  measure: number;
}

export interface SongSection {
  name: string;
  measures: ChordName[][]; // each inner array = one measure's chords per beat
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  timeSignature: [number, number]; // [beats, noteValue]
  capo: number; // fret number, 0 = no capo
  chords: ChordName[];
  sections: SongSection[];
  youtubeId: string;
  difficulty: 1 | 2 | 3; // 1=easiest
  hourUnlock: number; // which hour unlocks this song
  tips: string[];
  strumPattern: string; // e.g. "D DU UDU" or "RIFF" for single-note riffs
  anchorTip?: string;
  // For riff-based songs, the tab ASCII is shown instead of chord diagrams
  riffTab?: string;
  isRiffBased?: boolean;
}

export const SONGS: Song[] = [
  {
    id: 'seven-nation-army',
    title: 'Seven Nation Army',
    artist: 'The White Stripes',
    bpm: 124,
    timeSignature: [4, 4],
    capo: 0,
    chords: ['Em', 'G', 'D'],
    isRiffBased: true,
    riffTab: `
e |--------------------------|
B |--------------------------|
G |--------------------------|
D |--------------------------|
A |-7--7-10-7--5--3--2-------|  ← The famous riff (all on A string)
E |--------------------------|

Fret sequence: 7 7 10 7 5 3 2
Use one finger per fret:
  Fret 7  → ring finger
  Fret 10 → pinky (stretch!)
  Fret 5  → middle finger
  Fret 3  → index finger
  Fret 2  → index finger (slide down)
`.trim(),
    sections: [
      {
        name: 'Main Riff (repeats throughout)',
        measures: [
          ['Em', 'Em', 'Em', 'Em'],
          ['G', 'G', 'D', 'D'],
        ],
      },
    ],
    youtubeId: '0J2QdDbelmY',
    difficulty: 1,
    hourUnlock: 5,
    strumPattern: 'RIFF — single notes on A string',
    tips: [
      'The entire song is built on ONE riff played on the A string: frets 7-7-10-7-5-3-2',
      'Use your ring finger for fret 7, pinky for fret 10, middle for 5, index for 3 and 2',
      'No strumming needed — each number is a single note picked individually',
      'The riff repeats for the whole song — nail it slowly first, then build speed',
      'That low "bum bum bum" feeling comes from letting each note ring briefly before moving on',
    ],
    anchorTip: 'Keep your hand in position — only the active finger moves, the others hover ready',
  },
  {
    id: 'rasputin',
    title: 'Rasputin',
    artist: 'Boney M.',
    bpm: 126,
    timeSignature: [4, 4],
    capo: 0,
    chords: ['Am', 'Dm', 'E', 'G', 'C'],
    sections: [
      {
        name: 'Verse',
        measures: [
          ['Am', 'Am', 'Am', 'Am'],
          ['Dm', 'Dm', 'E', 'E'],
        ],
      },
      {
        name: 'Chorus',
        measures: [
          ['Am', 'Am', 'G', 'G'],
          ['Am', 'Am', 'E', 'E'],
          ['Am', 'Am', 'G', 'G'],
          ['C', 'C', 'E', 'E'],
        ],
      },
    ],
    youtubeId: 'ximFroSRSdE',
    difficulty: 2,
    hourUnlock: 6,
    strumPattern: 'D DU UDU',
    tips: [
      'Key of A minor — Am is your home chord, everything revolves around it',
      'E major (not Em!) is the dramatic chord that creates tension before returning to Am',
      'Am → Dm: keep middle finger on 2nd fret G string for both — anchor finger!',
      'The fast 126 BPM is exciting but learn each chord change cleanly at 60 BPM first',
      'Chorus energy: lean into the D DU UDU strum — channel your inner disco',
    ],
    anchorTip: 'Am → Dm: middle finger stays planted on G string fret 2',
  },
  {
    id: 'pirates-of-the-caribbean',
    title: 'Pirates of the Caribbean (He\'s a Pirate)',
    artist: 'Hans Zimmer',
    bpm: 160,
    timeSignature: [3, 4], // waltz feel, 3/4 time
    capo: 0,
    chords: ['Am', 'G', 'Dm', 'E', 'C', 'B7'],
    sections: [
      {
        name: 'Main Theme',
        measures: [
          ['Am', 'Am', 'G'],
          ['G', 'Am', 'Am'],
          ['Dm', 'Dm', 'Am'],
          ['Am', 'E', 'E'],
          ['Am', 'Am', 'G'],
          ['G', 'Am', 'Am'],
          ['Dm', 'Dm', 'E'],
          ['Am', 'Am', 'Am'],
        ],
      },
      {
        name: 'B Section',
        measures: [
          ['C', 'C', 'G'],
          ['G', 'Am', 'Am'],
          ['C', 'C', 'G'],
          ['G', 'E', 'E'],
          ['Am', 'Am', 'G'],
          ['G', 'Am', 'Am'],
          ['Dm', 'Dm', 'E'],
          ['Am', 'Am', 'Am'],
        ],
      },
    ],
    youtubeId: 'Sb1TBAbplUE',
    difficulty: 3,
    hourUnlock: 7,
    strumPattern: 'D DU DU (waltz 3/4)',
    tips: [
      '3/4 time = 3 beats per bar (like a waltz). Count "1-2-3, 1-2-3" instead of 4',
      'B7 chord is new — index on A fret 1, middle on G fret 1, ring on D fret 2, pinky on high e fret 2',
      'The dramatic feel comes from Am → G tension-release — lean on the Am for emphasis',
      'Start at 80 BPM (half the real speed). The full 160 BPM feels fast but the waltz rhythm helps',
      'Am is home base — every time you return to Am it should feel like relief and victory',
      'This is a film score — playing it "seriously" sounds incredible even at beginner speed',
    ],
    anchorTip: 'Am → G: ring finger moves from A string fret 2 (Am) to low E string fret 3 (G)',
  },
];

export const getSongById = (id: string) => SONGS.find(s => s.id === id);
