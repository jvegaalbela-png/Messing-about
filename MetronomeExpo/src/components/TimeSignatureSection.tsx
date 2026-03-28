import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, cardStyle } from '../theme';
import { MetronomeState, TIME_SIG_PRESETS } from '../state';

interface Props {
  state: MetronomeState;
  onSetTimeSig: (beats: number, unit: number) => void;
}

export default function TimeSignatureSection({ state, onSetTimeSig }: Props) {
  return (
    <View style={cardStyle.card}>
      <Text style={cardStyle.sectionLabel}>TIME SIGNATURE</Text>

      <View style={styles.presetsGrid}>
        {TIME_SIG_PRESETS.map((p) => {
          const isActive = state.beatsPerMeasure === p.beats && state.beatUnit === p.unit;
          return (
            <TouchableOpacity
              key={`${p.beats}/${p.unit}`}
              style={[styles.presetBtn, isActive && styles.presetBtnActive]}
              onPress={() => onSetTimeSig(p.beats, p.unit)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                {p.beats}/{p.unit}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.customRow}>
        <Text style={styles.customLabel}>Custom:</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.miniBtn}
            onPress={() => onSetTimeSig(Math.max(1, state.beatsPerMeasure - 1), state.beatUnit)}
          >
            <Text style={styles.miniBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{state.beatsPerMeasure}</Text>
          <TouchableOpacity
            style={styles.miniBtn}
            onPress={() => onSetTimeSig(Math.min(32, state.beatsPerMeasure + 1), state.beatUnit)}
          >
            <Text style={styles.miniBtnText}>+</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.slash}>/</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.miniBtn}
            onPress={() => {
              const units = [1, 2, 4, 8, 16, 32];
              const idx = units.indexOf(state.beatUnit);
              if (idx > 0) onSetTimeSig(state.beatsPerMeasure, units[idx - 1]);
            }}
          >
            <Text style={styles.miniBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{state.beatUnit}</Text>
          <TouchableOpacity
            style={styles.miniBtn}
            onPress={() => {
              const units = [1, 2, 4, 8, 16, 32];
              const idx = units.indexOf(state.beatUnit);
              if (idx < units.length - 1) onSetTimeSig(state.beatsPerMeasure, units[idx + 1]);
            }}
          >
            <Text style={styles.miniBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetBtn: {
    backgroundColor: Colors.btnBg,
    borderColor: Colors.btnBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  presetBtnActive: {
    backgroundColor: Colors.btnActiveBg,
    borderColor: Colors.btnActiveBorder,
  },
  presetText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' },
  presetTextActive: { color: Colors.btnActiveText },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customLabel: { color: Colors.textDim, fontSize: 12 },
  slash: { color: Colors.textDim, fontSize: 22, fontWeight: '300' },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.btnBg,
    borderColor: Colors.btnBorder,
    borderWidth: 1,
    borderRadius: 6,
  },
  miniBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  miniBtnText: { color: Colors.textSecondary, fontSize: 16, fontWeight: '700' },
  stepperValue: { color: Colors.accentBlueBright, fontSize: 14, fontWeight: '600', minWidth: 24, textAlign: 'center' },
});
