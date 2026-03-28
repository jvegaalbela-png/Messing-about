import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, cardStyle } from '../theme';
import { MetronomeState, BeatState, BEAT_ICONS, BEAT_CYCLE } from '../state';

interface Props {
  state: MetronomeState;
  onCycleBeat: (index: number) => void;
}

export default function BeatGridSection({ state, onCycleBeat }: Props) {
  const displayStates =
    state.formEnabled && state.form.length > 0
      ? state.form[Math.max(0, Math.min(state.currentFormIndex, state.form.length - 1))]?.states ?? state.beatStates
      : state.beatStates;

  return (
    <View style={cardStyle.card}>
      <Text style={cardStyle.sectionLabel}>BEATS</Text>

      <View style={styles.grid}>
        {displayStates.map((bs, i) => {
          const isActive = state.isPlaying && state.currentBeat === i && state.currentSub === 0;
          return (
            <BeatCircle
              key={i}
              index={i}
              beatState={bs}
              isActive={isActive}
              onPress={() => onCycleBeat(i)}
            />
          );
        })}
      </View>

      {state.subdivision > 1 && (
        <View style={styles.subDotsRow}>
          {Array.from({ length: state.subdivision }, (_, i) => {
            const isActiveSub = state.isPlaying && state.currentSub === i;
            const isAccent = isActiveSub && state.currentClickType === 'accent';
            return (
              <View
                key={i}
                style={[
                  styles.subDot,
                  isActiveSub && (isAccent ? styles.subDotAccent : styles.subDotActive),
                ]}
              />
            );
          })}
        </View>
      )}

      <Text style={styles.hint}>Tap a beat to cycle: Normal → Accent → Mute</Text>
    </View>
  );
}

function BeatCircle({
  index, beatState, isActive, onPress,
}: {
  index: number; beatState: BeatState; isActive: boolean; onPress: () => void;
}) {
  const colors = getBeatColors(beatState, isActive);

  return (
    <TouchableOpacity
      style={[
        styles.beatBtn,
        { backgroundColor: colors.bg, borderColor: colors.border },
        isActive && styles.beatBtnActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.beatNum, { color: colors.text }]}>{index + 1}</Text>
      <Text style={[styles.beatIcon, { color: colors.text }]}>{BEAT_ICONS[beatState]}</Text>
    </TouchableOpacity>
  );
}

function getBeatColors(bs: BeatState, active: boolean) {
  if (bs === 'accent') {
    return active
      ? { bg: '#3a2e00', border: Colors.gold, text: '#ffe070' }
      : { bg: '#2a2000', border: Colors.goldDim, text: Colors.gold };
  }
  if (bs === 'mute') {
    return active
      ? { bg: Colors.muteBg, border: '#404055', text: Colors.muteText }
      : { bg: Colors.muteBg, border: Colors.muteBorder, text: Colors.muteText };
  }
  // normal
  return active
    ? { bg: '#25256a', border: Colors.accentBlueBright, text: '#c0c0ff' }
    : { bg: Colors.btnBg, border: '#404080', text: '#8080c0' };
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  beatBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  beatBtnActive: {
    borderWidth: 3,
    transform: [{ scale: 1.12 }],
  },
  beatNum: { fontSize: 20, fontWeight: '700', lineHeight: 22 },
  beatIcon: { fontSize: 9, opacity: 0.7 },
  subDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  subDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#20204a',
    borderWidth: 1,
    borderColor: Colors.btnBorder,
  },
  subDotActive: {
    backgroundColor: '#5050c0',
    borderColor: Colors.accentBlueBright,
  },
  subDotAccent: {
    backgroundColor: '#c09000',
    borderColor: Colors.gold,
  },
  hint: {
    color: Colors.textDim,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
  },
});
