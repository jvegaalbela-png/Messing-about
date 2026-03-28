import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, cardStyle } from '../theme';
import { MetronomeState, getTempoName } from '../state';

interface Props {
  state: MetronomeState;
  onSetBPM: (bpm: number) => void;
  onTapTempo: () => void;
  onTogglePlay: () => void;
}

export default function TempoSection({ state, onSetBPM, onTapTempo, onTogglePlay }: Props) {
  const bpm = Math.round(state.bpm);

  return (
    <View style={cardStyle.card}>
      <Text style={cardStyle.sectionLabel}>TEMPO</Text>

      <View style={styles.bpmRow}>
        <View style={styles.stepGroup}>
          <StepBtn label="−1" onPress={() => onSetBPM(bpm - 1)} />
          <StepBtn label="−5" onPress={() => onSetBPM(bpm - 5)} />
        </View>

        <View style={styles.bpmCenter}>
          <Text style={styles.bpmNumber}>{bpm}</Text>
          <Text style={styles.bpmUnit}>BPM</Text>
          <Text style={styles.tempoName}>{getTempoName(bpm)}</Text>
        </View>

        <View style={styles.stepGroup}>
          <StepBtn label="+1" onPress={() => onSetBPM(bpm + 1)} />
          <StepBtn label="+5" onPress={() => onSetBPM(bpm + 5)} />
        </View>
      </View>

      <View style={styles.sliderRow}>
        <Text style={styles.sliderLabel}>1</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={500}
          step={1}
          value={bpm}
          onValueChange={onSetBPM}
          minimumTrackTintColor={Colors.accentBlue}
          maximumTrackTintColor={Colors.sliderTrack}
          thumbTintColor={Colors.sliderThumb}
        />
        <Text style={styles.sliderLabel}>500</Text>
      </View>

      <TouchableOpacity style={styles.tapBtn} onPress={onTapTempo} activeOpacity={0.7}>
        <Text style={styles.tapBtnText}>Tap Tempo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.playBtn, state.isPlaying && styles.playBtnActive]}
        onPress={onTogglePlay}
        activeOpacity={0.7}
      >
        <Text style={[styles.playBtnText, state.isPlaying && styles.playBtnTextActive]}>
          {state.isPlaying ? '■  Stop' : '▶  Start'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function StepBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.stepBtn} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.stepBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  stepGroup: { gap: 8 },
  stepBtn: {
    backgroundColor: Colors.btnBg,
    borderColor: Colors.btnBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 48,
    alignItems: 'center',
  },
  stepBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '500' },
  bpmCenter: { alignItems: 'center' },
  bpmNumber: { color: '#ffffff', fontSize: 64, fontWeight: '700', lineHeight: 70 },
  bpmUnit: { color: Colors.textDim, fontSize: 10, fontWeight: '600', letterSpacing: 3, marginTop: 2 },
  tempoName: { color: Colors.textSecondary, fontSize: 10, fontWeight: '500', letterSpacing: 3, marginTop: 2 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sliderLabel: { color: Colors.textDim, fontSize: 11 },
  slider: { flex: 1, height: 40 },
  tapBtn: {
    backgroundColor: Colors.btnBg,
    borderColor: Colors.btnBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  tapBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
  playBtn: {
    backgroundColor: Colors.playBg,
    borderColor: Colors.playBorder,
    borderWidth: 1,
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    alignSelf: 'center',
  },
  playBtnActive: {
    backgroundColor: Colors.stopBg,
    borderColor: Colors.stopBorder,
  },
  playBtnText: { color: Colors.textPrimary, fontSize: 18, fontWeight: '600', letterSpacing: 1.5 },
  playBtnTextActive: { color: '#ffccd8' },
});
