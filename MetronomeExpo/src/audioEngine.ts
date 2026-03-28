import { Audio } from 'expo-av';
import { BeatState, ClickType, SoundMode, GapPhase, FormEntry } from './state';

// Generates a WAV buffer for a click sound
function generateClickWav(
  sampleRate: number,
  frequency: number,
  attackMs: number,
  decayMs: number,
  volume: number,
  durationMs: number,
): string {
  const numSamples = Math.ceil((sampleRate * durationMs) / 1000);
  const attackSamples = Math.ceil((sampleRate * attackMs) / 1000);
  const decayConstant = (sampleRate * decayMs) / 1000;

  const samples = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sine = Math.sin(2 * Math.PI * frequency * t);
    const attack = Math.min(i / Math.max(attackSamples, 1), 1);
    const decay = Math.exp(-i / decayConstant);
    const value = sine * attack * decay * volume;
    samples[i] = Math.max(-32768, Math.min(32767, Math.round(value * 32767)));
  }

  return createWavBase64(samples, sampleRate);
}

function createWavBase64(samples: Int16Array, sampleRate: number): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(headerSize + i * 2, samples[i], true);
  }

  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Sound definitions matching the HTML version
interface SoundDef {
  frequency: number;
  attackMs: number;
  decayMs: number;
  volume: number;
  durationMs: number;
}

const SOUNDS: Record<SoundMode, Record<'accent' | 'beat' | 'sub', SoundDef>> = {
  electronic: {
    accent: { frequency: 1050, attackMs: 1, decayMs: 25, volume: 0.9, durationMs: 150 },
    beat:   { frequency: 800,  attackMs: 1, decayMs: 20, volume: 0.7, durationMs: 120 },
    sub:    { frequency: 1600, attackMs: 1, decayMs: 12, volume: 0.3, durationMs: 60 },
  },
  clave: {
    accent: { frequency: 1500, attackMs: 0.8, decayMs: 12, volume: 1.0, durationMs: 80 },
    beat:   { frequency: 1150, attackMs: 0.8, decayMs: 9,  volume: 0.75, durationMs: 60 },
    sub:    { frequency: 2000, attackMs: 0.5, decayMs: 5,  volume: 0.35, durationMs: 30 },
  },
};

const SAMPLE_RATE = 44100;

// Pre-generated sound cache
const soundCache: Map<string, string> = new Map();

function getSoundUri(mode: SoundMode, type: 'accent' | 'beat' | 'sub'): string {
  const key = `${mode}_${type}`;
  if (!soundCache.has(key)) {
    const def = SOUNDS[mode][type];
    const base64 = generateClickWav(
      SAMPLE_RATE, def.frequency, def.attackMs, def.decayMs, def.volume, def.durationMs
    );
    soundCache.set(key, `data:audio/wav;base64,${base64}`);
  }
  return soundCache.get(key)!;
}

// Engine config (mirrors what we need from state)
export interface EngineConfig {
  bpm: number;
  beatsPerMeasure: number;
  subdivision: number;
  beatStates: BeatState[];
  soundMode: SoundMode;
  gapEnabled: boolean;
  gapPlay: number;
  gapSilent: number;
  randomMuteEnabled: boolean;
  randomMutePct: number;
  formEnabled: boolean;
  form: FormEntry[];
}

export type BeatCallback = (
  beat: number,
  sub: number,
  clickType: ClickType,
  gapPhase: GapPhase,
  gapMeasureCount: number,
  formIndex: number,
) => void;

export class MetronomeEngine {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private soundObjects: Map<string, Audio.Sound> = new Map();
  private config: EngineConfig | null = null;
  private onBeat: BeatCallback | null = null;

  // Playback state
  private beatIndex = 0;
  private subIndex = 0;
  private gapPhase: GapPhase = 'play';
  private gapMeasureCount = 0;
  private formIndex = 0;
  private nextTickTime = 0;
  private isRunning = false;

  constructor() {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    });
  }

  setOnBeat(cb: BeatCallback) {
    this.onBeat = cb;
  }

  updateConfig(config: EngineConfig) {
    this.config = { ...config };
  }

  async start(config: EngineConfig) {
    this.config = { ...config };
    this.beatIndex = 0;
    this.subIndex = 0;
    this.gapPhase = 'play';
    this.gapMeasureCount = 0;
    this.formIndex = 0;
    this.isRunning = true;

    // Pre-load sounds
    await this.preloadSounds(config.soundMode);

    this.nextTickTime = Date.now() + 50;
    this.scheduleTick();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async cleanup() {
    this.stop();
    for (const [, sound] of this.soundObjects) {
      try { await sound.unloadAsync(); } catch {}
    }
    this.soundObjects.clear();
  }

  private async preloadSounds(mode: SoundMode) {
    const types: ('accent' | 'beat' | 'sub')[] = ['accent', 'beat', 'sub'];
    for (const type of types) {
      const key = `${mode}_${type}`;
      if (!this.soundObjects.has(key)) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: getSoundUri(mode, type) },
            { shouldPlay: false, volume: 1.0 }
          );
          this.soundObjects.set(key, sound);
        } catch (e) {
          console.warn('Failed to load sound', key, e);
        }
      }
    }
  }

  private scheduleTick() {
    if (!this.isRunning || !this.config) return;

    const now = Date.now();
    const delay = Math.max(0, this.nextTickTime - now);

    this.timer = setTimeout(() => {
      if (!this.isRunning || !this.config) return;
      this.tick();
    }, delay);
  }

  private async tick() {
    if (!this.config) return;
    const cfg = this.config;

    // Effective meter
    let effBeats: number;
    let effStates: BeatState[];
    if (cfg.formEnabled && cfg.form.length > 0) {
      const entry = cfg.form[this.formIndex % cfg.form.length];
      effBeats = entry.beats;
      effStates = entry.states;
    } else {
      effBeats = cfg.beatsPerMeasure;
      effStates = cfg.beatStates;
    }

    // Determine click type
    let clickType: ClickType;
    if (this.subIndex === 0) {
      const bs = this.beatIndex < effStates.length ? effStates[this.beatIndex] : 'normal';
      clickType = bs === 'mute' ? 'mute' : bs === 'accent' ? 'accent' : 'beat';
    } else {
      clickType = 'sub';
    }

    // Gap click override
    if (cfg.gapEnabled && this.gapPhase === 'silent') {
      clickType = 'mute';
    }

    // Random mute
    if (cfg.randomMuteEnabled && this.subIndex === 0 && clickType !== 'mute') {
      if (Math.random() * 100 < cfg.randomMutePct) {
        clickType = 'mute';
      }
    }

    // Play sound
    if (clickType !== 'mute') {
      const soundType = clickType === 'accent' ? 'accent' : clickType === 'beat' ? 'beat' : 'sub';
      await this.playSound(cfg.soundMode, soundType);
    }

    // Notify UI
    this.onBeat?.(
      this.beatIndex,
      this.subIndex,
      clickType,
      cfg.gapEnabled ? this.gapPhase : 'idle',
      this.gapMeasureCount,
      this.formIndex,
    );

    // Advance timing
    const msPerSub = (60000 / cfg.bpm) / Math.max(1, cfg.subdivision);
    this.nextTickTime += msPerSub;

    // Advance position
    this.subIndex++;
    if (this.subIndex >= cfg.subdivision) {
      this.subIndex = 0;
      this.beatIndex++;
      if (this.beatIndex >= effBeats) {
        this.beatIndex = 0;

        if (cfg.gapEnabled) {
          this.gapMeasureCount++;
          if (this.gapPhase === 'play' && this.gapMeasureCount >= cfg.gapPlay) {
            this.gapPhase = 'silent';
            this.gapMeasureCount = 0;
          } else if (this.gapPhase === 'silent' && this.gapMeasureCount >= cfg.gapSilent) {
            this.gapPhase = 'play';
            this.gapMeasureCount = 0;
          }
        }

        if (cfg.formEnabled && cfg.form.length > 0) {
          this.formIndex = (this.formIndex + 1) % cfg.form.length;
        }
      }
    }

    // Schedule next
    this.scheduleTick();
  }

  private async playSound(mode: SoundMode, type: 'accent' | 'beat' | 'sub') {
    const key = `${mode}_${type}`;
    let sound = this.soundObjects.get(key);

    if (!sound) {
      await this.preloadSounds(mode);
      sound = this.soundObjects.get(key);
    }

    if (sound) {
      try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      } catch {
        // Recreate sound if playback fails
        try {
          await sound.unloadAsync();
        } catch {}
        this.soundObjects.delete(key);
        try {
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: getSoundUri(mode, type) },
            { shouldPlay: true, volume: 1.0 }
          );
          this.soundObjects.set(key, newSound);
        } catch {}
      }
    }
  }
}
