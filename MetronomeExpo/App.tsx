import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Switch, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Colors } from './src/theme';
import {
  MetronomeState, BeatState, SoundMode, ClickType, GapPhase,
  createInitialState, BEAT_CYCLE, makeFormEntry,
} from './src/state';
import { MetronomeEngine, EngineConfig } from './src/audioEngine';
import TempoSection from './src/components/TempoSection';
import TimeSignatureSection from './src/components/TimeSignatureSection';
import SubdivisionSection from './src/components/SubdivisionSection';
import SoundSection from './src/components/SoundSection';
import BeatGridSection from './src/components/BeatGridSection';
import AdvancedSection from './src/components/AdvancedSection';

export default function App() {
  const [state, setState] = useState<MetronomeState>(createInitialState);
  const engineRef = useRef<MetronomeEngine | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Form undo/redo history
  const formHistoryRef = useRef<MetronomeState['form'][]>([]);
  const formHistoryIdxRef = useRef(-1);

  useEffect(() => {
    const engine = new MetronomeEngine();
    engineRef.current = engine;

    engine.setOnBeat((beat, sub, clickType, gapPhase, gapCount, formIdx) => {
      setState((s) => ({
        ...s,
        currentBeat: beat,
        currentSub: sub,
        currentClickType: clickType,
        gapPhase: gapPhase,
        gapMeasureCount: gapCount,
        currentFormIndex: formIdx,
      }));
    });

    // Init form history
    formHistoryRef.current = [state.form];
    formHistoryIdxRef.current = 0;

    return () => {
      engine.cleanup();
    };
  }, []);

  // Sync config to engine when relevant state changes
  useEffect(() => {
    if (state.isPlaying && engineRef.current) {
      engineRef.current.updateConfig(getEngineConfig(state));
    }
  }, [
    state.bpm, state.beatsPerMeasure, state.subdivision, state.beatStates,
    state.soundMode, state.gapEnabled, state.gapPlay, state.gapSilent,
    state.randomMuteEnabled, state.randomMutePct, state.formEnabled, state.form,
  ]);

  const setBPM = useCallback((bpm: number) => {
    setState((s) => ({ ...s, bpm: Math.max(1, Math.min(500, Math.round(bpm))) }));
  }, []);

  const tapTimesRef = useRef<number[]>([]);
  const tapTempo = useCallback(() => {
    const now = Date.now();
    tapTimesRef.current.push(now);
    tapTimesRef.current = tapTimesRef.current.filter((t) => now - t < 4000).slice(-8);
    if (tapTimesRef.current.length >= 2) {
      const times = tapTimesRef.current;
      let sum = 0;
      for (let i = 1; i < times.length; i++) sum += times[i] - times[i - 1];
      const avg = sum / (times.length - 1);
      setBPM(Math.round(60000 / avg));
    }
  }, [setBPM]);

  const togglePlay = useCallback(async () => {
    const s = stateRef.current;
    if (s.isPlaying) {
      engineRef.current?.stop();
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentBeat: -1,
        currentSub: 0,
        gapPhase: 'idle',
      }));
    } else {
      setState((prev) => ({ ...prev, isPlaying: true }));
      const newState = { ...s, isPlaying: true };
      await engineRef.current?.start(getEngineConfig(newState));
    }
  }, []);

  const setTimeSig = useCallback((beats: number, unit: number) => {
    setState((s) => {
      const b = Math.max(1, Math.min(32, beats));
      const newStates: BeatState[] = [];
      for (let i = 0; i < b; i++) {
        newStates.push(i < s.beatStates.length ? s.beatStates[i] : 'normal');
      }
      if (s.beatStates.length === 0 && newStates.length > 0) newStates[0] = 'accent';
      return { ...s, beatsPerMeasure: b, beatUnit: unit, beatStates: newStates };
    });
  }, []);

  const setSubdivision = useCallback((sub: number) => {
    setState((s) => ({ ...s, subdivision: sub }));
  }, []);

  const setSound = useCallback((mode: SoundMode) => {
    setState((s) => ({ ...s, soundMode: mode }));
  }, []);

  const cycleBeat = useCallback((index: number) => {
    setState((s) => {
      if (s.formEnabled && s.form.length > 0) {
        const fi = Math.max(0, Math.min(s.currentFormIndex, s.form.length - 1));
        const newForm = [...s.form];
        const entry = { ...newForm[fi], states: [...newForm[fi].states] };
        if (index < entry.states.length) {
          entry.states[index] = BEAT_CYCLE[entry.states[index]];
        }
        newForm[fi] = entry;
        return { ...s, form: newForm };
      }
      const newStates = [...s.beatStates];
      if (index < newStates.length) {
        newStates[index] = BEAT_CYCLE[newStates[index]];
      }
      return { ...s, beatStates: newStates };
    });
  }, []);

  const onUpdate = useCallback((patch: Partial<MetronomeState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const saveFormSnapshot = useCallback(() => {
    const s = stateRef.current;
    const history = formHistoryRef.current;
    const idx = formHistoryIdxRef.current;
    formHistoryRef.current = history.slice(0, idx + 1);
    formHistoryRef.current.push(JSON.parse(JSON.stringify(s.form)));
    if (formHistoryRef.current.length > 80) formHistoryRef.current.shift();
    formHistoryIdxRef.current = formHistoryRef.current.length - 1;
  }, []);

  // Header beat flash
  const flashActive = state.isPlaying && state.currentBeat >= 0 && state.currentSub === 0 && state.currentClickType !== 'mute';
  const flashColor = !flashActive ? '#2a2a50'
    : state.currentClickType === 'accent' ? Colors.gold : Colors.accentBlue;
  const flashBorder = !flashActive ? '#4040a0'
    : state.currentClickType === 'accent' ? '#ffd060' : Colors.accentBlueBright;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.flash, { backgroundColor: flashColor, borderColor: flashBorder }]} />
          <Text style={styles.title}>METRONOME</Text>
          <View style={[styles.flash, { backgroundColor: flashColor, borderColor: flashBorder }]} />
        </View>

        <TempoSection state={state} onSetBPM={setBPM} onTapTempo={tapTempo} onTogglePlay={togglePlay} />
        <TimeSignatureSection state={state} onSetTimeSig={setTimeSig} />
        <SubdivisionSection state={state} onSetSubdivision={setSubdivision} />
        <SoundSection state={state} onSetSound={setSound} />
        <BeatGridSection state={state} onCycleBeat={cycleBeat} />

        {/* Advanced Toggle */}
        <TouchableOpacity
          style={styles.advToggle}
          onPress={() => onUpdate({ advancedEnabled: !state.advancedEnabled })}
          activeOpacity={0.7}
        >
          <Text style={[styles.advToggleText, state.advancedEnabled && styles.advToggleTextActive]}>
            ~  A D V A N C E D   M O D E  ~
          </Text>
          <Switch
            value={state.advancedEnabled}
            onValueChange={(v) => onUpdate({ advancedEnabled: v })}
            trackColor={{ false: '#1a1a35', true: Colors.accentBlue }}
            thumbColor={state.advancedEnabled ? '#a0a0ff' : '#404080'}
          />
        </TouchableOpacity>

        {state.advancedEnabled && (
          <AdvancedSection state={state} onUpdate={onUpdate} onSaveFormSnapshot={saveFormSnapshot} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getEngineConfig(state: MetronomeState): EngineConfig {
  return {
    bpm: state.bpm,
    beatsPerMeasure: state.beatsPerMeasure,
    subdivision: state.subdivision,
    beatStates: state.beatStates,
    soundMode: state.soundMode,
    gapEnabled: state.gapEnabled,
    gapPlay: state.gapPlay,
    gapSilent: state.gapSilent,
    randomMuteEnabled: state.randomMuteEnabled,
    randomMutePct: state.randomMutePct,
    formEnabled: state.formEnabled,
    form: state.form,
  };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  flash: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  title: {
    color: '#8888cc',
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: 6,
  },
  advToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    marginBottom: 4,
  },
  advToggleText: {
    color: Colors.textDim,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
  },
  advToggleTextActive: { color: Colors.textSecondary },
});
