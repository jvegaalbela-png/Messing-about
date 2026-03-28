export type BeatState = 'normal' | 'accent' | 'mute';
export type ClickType = 'accent' | 'beat' | 'sub' | 'mute';
export type SoundMode = 'electronic' | 'clave';
export type GapPhase = 'idle' | 'play' | 'silent';

export const BEAT_CYCLE: Record<BeatState, BeatState> = {
  normal: 'accent',
  accent: 'mute',
  mute: 'normal',
};

export const BEAT_ICONS: Record<BeatState, string> = {
  normal: '●',
  accent: '▲',
  mute: '✕',
};

export interface FormEntry {
  id: string;
  beats: number;
  unit: number;
  states: BeatState[];
}

export function makeFormEntry(beats = 4, unit = 4, states?: BeatState[]): FormEntry {
  if (!states) {
    states = Array(beats).fill('normal') as BeatState[];
    if (states.length > 0) states[0] = 'accent';
  }
  return { id: Math.random().toString(36).slice(2), beats, unit, states };
}

export interface MetronomeState {
  bpm: number;
  beatsPerMeasure: number;
  beatUnit: number;
  subdivision: number;
  beatStates: BeatState[];
  isPlaying: boolean;
  soundMode: SoundMode;
  currentBeat: number;
  currentSub: number;
  currentClickType: ClickType;
  advancedEnabled: boolean;
  gapEnabled: boolean;
  gapPlay: number;
  gapSilent: number;
  randomMuteEnabled: boolean;
  randomMutePct: number;
  formEnabled: boolean;
  form: FormEntry[];
  gapPhase: GapPhase;
  gapMeasureCount: number;
  currentFormIndex: number;
}

export function createInitialState(): MetronomeState {
  return {
    bpm: 120,
    beatsPerMeasure: 4,
    beatUnit: 4,
    subdivision: 1,
    beatStates: ['accent', 'normal', 'normal', 'normal'],
    isPlaying: false,
    soundMode: 'electronic',
    currentBeat: -1,
    currentSub: 0,
    currentClickType: 'beat',
    advancedEnabled: false,
    gapEnabled: false,
    gapPlay: 2,
    gapSilent: 2,
    randomMuteEnabled: false,
    randomMutePct: 30,
    formEnabled: false,
    form: [makeFormEntry()],
    gapPhase: 'idle',
    gapMeasureCount: 0,
    currentFormIndex: 0,
  };
}

export const TEMPO_MARKS: [number, string][] = [
  [24, 'Larghissimo'], [39, 'Grave'], [54, 'Largo'],
  [64, 'Larghetto'], [74, 'Adagio'], [79, 'Adagietto'],
  [93, 'Andante'], [107, 'Andantino'], [119, 'Moderato'],
  [129, 'Allegretto'], [167, 'Allegro'], [179, 'Vivace'],
  [199, 'Presto'], [500, 'Prestissimo'],
];

export function getTempoName(bpm: number): string {
  for (const [max, name] of TEMPO_MARKS) {
    if (bpm <= max) return name;
  }
  return 'Prestissimo';
}

export const TIME_SIG_PRESETS: { beats: number; unit: number }[] = [
  { beats: 2, unit: 4 }, { beats: 3, unit: 4 }, { beats: 4, unit: 4 },
  { beats: 5, unit: 4 }, { beats: 6, unit: 4 }, { beats: 7, unit: 4 },
  { beats: 6, unit: 8 }, { beats: 7, unit: 8 }, { beats: 9, unit: 8 },
  { beats: 12, unit: 8 },
];

export const SUBDIVISIONS = [
  { sub: 1, icon: '♩', label: 'None' },
  { sub: 2, icon: '♪♪', label: 'Duplet' },
  { sub: 3, icon: '♪♪♪', label: 'Triplet' },
  { sub: 4, icon: '♬♬', label: 'Quad' },
];
