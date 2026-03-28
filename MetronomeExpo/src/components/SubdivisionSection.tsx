import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, cardStyle } from '../theme';
import { MetronomeState, SUBDIVISIONS } from '../state';

interface Props {
  state: MetronomeState;
  onSetSubdivision: (sub: number) => void;
}

export default function SubdivisionSection({ state, onSetSubdivision }: Props) {
  return (
    <View style={cardStyle.card}>
      <Text style={cardStyle.sectionLabel}>SUBDIVISION</Text>
      <View style={styles.grid}>
        {SUBDIVISIONS.map((opt) => {
          const isActive = state.subdivision === opt.sub;
          return (
            <TouchableOpacity
              key={opt.sub}
              style={[styles.btn, isActive && styles.btnActive]}
              onPress={() => onSetSubdivision(opt.sub)}
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
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  btnActive: {
    backgroundColor: Colors.btnActiveBg,
    borderColor: Colors.btnActiveBorder,
  },
  icon: { color: Colors.textPrimary, fontSize: 16 },
  label: { color: Colors.textDim, fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  labelActive: { color: Colors.btnActiveText },
});
