import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, cardStyle } from '../theme';
import { MetronomeState, SoundMode } from '../state';

interface Props {
  state: MetronomeState;
  onSetSound: (mode: SoundMode) => void;
}

const SOUND_OPTIONS: { mode: SoundMode; icon: string; label: string }[] = [
  { mode: 'electronic', icon: '∿', label: 'Electronic' },
  { mode: 'clave', icon: '▮', label: 'Clave' },
];

export default function SoundSection({ state, onSetSound }: Props) {
  return (
    <View style={cardStyle.card}>
      <Text style={cardStyle.sectionLabel}>SOUND</Text>
      <View style={styles.grid}>
        {SOUND_OPTIONS.map((opt) => {
          const isActive = state.soundMode === opt.mode;
          return (
            <TouchableOpacity
              key={opt.mode}
              style={[styles.btn, isActive && styles.btnActive]}
              onPress={() => onSetSound(opt.mode)}
              activeOpacity={0.7}
            >
              <Text style={styles.icon}>{opt.icon}</Text>
              <Text style={[styles.label, isActive && styles.labelActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    backgroundColor: Colors.btnBg,
    borderColor: Colors.btnBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  btnActive: {
    backgroundColor: Colors.btnActiveBg,
    borderColor: Colors.btnActiveBorder,
  },
  icon: { color: Colors.textPrimary, fontSize: 20 },
  label: { color: Colors.textDim, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  labelActive: { color: Colors.btnActiveText },
});
