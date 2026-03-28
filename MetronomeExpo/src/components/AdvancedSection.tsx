import React from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, cardStyle } from '../theme';
import { MetronomeState, GapPhase, makeFormEntry, BeatState } from '../state';

interface Props {
  state: MetronomeState;
  onUpdate: (patch: Partial<MetronomeState>) => void;
  onSaveFormSnapshot: () => void;
}

export default function AdvancedSection({ state, onUpdate, onSaveFormSnapshot }: Props) {
  return (
    <>
      <GapClickCard state={state} onUpdate={onUpdate} />
      <RandomMuteCard state={state} onUpdate={onUpdate} />
      <CustomFormCard state={state} onUpdate={onUpdate} onSaveSnapshot={onSaveFormSnapshot} />
    </>
  );
}

// MARK: - Gap Click

function GapClickCard({ state, onUpdate }: { state: MetronomeState; onUpdate: (p: Partial<MetronomeState>) => void }) {
  return (
    <View style={cardStyle.card}>
      <View style={styles.featureHeader}>
        <View style={styles.featureInfo}>
          <Text style={cardStyle.sectionLabel}>GAP CLICK</Text>
          <Text style={styles.featureDesc}>
            Play for N measures, then silence for M — trains your internal clock
          </Text>
        </View>
        <Switch
          value={state.gapEnabled}
          onValueChange={(v) => onUpdate({ gapEnabled: v })}
          trackColor={{ false: '#1a1a35', true: Colors.accentBlue }}
          thumbColor={state.gapEnabled ? '#a0a0ff' : '#404080'}
        />
      </View>

      {state.gapEnabled && (
        <View style={styles.controlsArea}>
          <SliderRow
            label="Play"
            value={state.gapPlay}
            min={1}
            max={16}
            unit="measures"
            onChange={(v) => onUpdate({ gapPlay: v })}
          />
          <SliderRow
            label="Silence"
            value={state.gapSilent}
            min={1}
            max={16}
            unit="measures"
            onChange={(v) => onUpdate({ gapSilent: v })}
          />
          <GapPhasePill phase={state.gapPhase} count={state.gapMeasureCount} state={state} />
        </View>
      )}
    </View>
  );
}

function GapPhasePill({ phase, count, state }: { phase: GapPhase; count: number; state: MetronomeState }) {
  let text: string;
  let color: string;
  let bgColor: string;
  let borderColor: string;
  let progress = '';

  switch (phase) {
    case 'play':
      text = '▶ Playing';
      color = Colors.greenPill;
      bgColor = Colors.greenPillBg;
      borderColor = Colors.greenPillBorder;
      const playLeft = Math.max(0, state.gapPlay - count);
      progress = `${playLeft} measure${playLeft !== 1 ? 's' : ''} left`;
      break;
    case 'silent':
      text = '● Silent';
      color = Colors.redPill;
      bgColor = Colors.redPillBg;
      borderColor = Colors.redPillBorder;
      const silentLeft = Math.max(0, state.gapSilent - count);
      progress = `${silentLeft} measure${silentLeft !== 1 ? 's' : ''} left`;
      break;
    default:
      text = '● Waiting';
      color = Colors.textDim;
      bgColor = '#1a1a35';
      borderColor = '#30305a';
  }

  return (
    <View style={styles.phaseRow}>
      <View style={[styles.pill, { backgroundColor: bgColor, borderColor }]}>
        <Text style={[styles.pillText, { color }]}>{text}</Text>
      </View>
      {progress ? <Text style={styles.phaseProgress}>{progress}</Text> : null}
    </View>
  );
}

// MARK: - Random Mute

function RandomMuteCard({ state, onUpdate }: { state: MetronomeState; onUpdate: (p: Partial<MetronomeState>) => void }) {
  return (
    <View style={cardStyle.card}>
      <View style={styles.featureHeader}>
        <View style={styles.featureInfo}>
          <Text style={cardStyle.sectionLabel}>RANDOM MUTE</Text>
          <Text style={styles.featureDesc}>Each beat has a chance of being silenced at random</Text>
        </View>
        <Switch
          value={state.randomMuteEnabled}
          onValueChange={(v) => onUpdate({ randomMuteEnabled: v })}
          trackColor={{ false: '#1a1a35', true: Colors.accentBlue }}
          thumbColor={state.randomMuteEnabled ? '#a0a0ff' : '#404080'}
        />
      </View>

      {state.randomMuteEnabled && (
        <SliderRow
          label="Probability"
          value={state.randomMutePct}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => onUpdate({ randomMutePct: v })}
        />
      )}
    </View>
  );
}

// MARK: - Custom Form

function CustomFormCard({
  state, onUpdate, onSaveSnapshot,
}: {
  state: MetronomeState;
  onUpdate: (p: Partial<MetronomeState>) => void;
  onSaveSnapshot: () => void;
}) {
  const addMeasure = () => {
    if (state.form.length >= 256) return;
    onSaveSnapshot();
    const last = state.form[state.form.length - 1];
    const newEntry = makeFormEntry(last?.beats ?? 4, last?.unit ?? 4);
    onUpdate({ form: [...state.form, newEntry] });
  };

  const deleteMeasure = (index: number) => {
    if (state.form.length <= 1) return;
    onSaveSnapshot();
    const newForm = state.form.filter((_, i) => i !== index);
    onUpdate({ form: newForm });
  };

  const bulkAdd = (count: number, beats: number, unit: number) => {
    const slots = Math.min(count, 256 - state.form.length);
    if (slots <= 0) return;
    onSaveSnapshot();
    const newEntries = Array.from({ length: slots }, () => makeFormEntry(beats, unit));
    onUpdate({ form: [...state.form, ...newEntries] });
  };

  return (
    <View style={cardStyle.card}>
      <View style={styles.featureHeader}>
        <View style={styles.featureInfo}>
          <Text style={cardStyle.sectionLabel}>CUSTOM FORM</Text>
          <Text style={styles.featureDesc}>
            Up to 256 measures with shifting time signatures, looping continuously
          </Text>
        </View>
        <Switch
          value={state.formEnabled}
          onValueChange={(v) => onUpdate({ formEnabled: v })}
          trackColor={{ false: '#1a1a35', true: Colors.accentBlue }}
          thumbColor={state.formEnabled ? '#a0a0ff' : '#404080'}
        />
      </View>

      {state.formEnabled && (
        <View style={styles.controlsArea}>
          <BulkAddRow onBulkAdd={bulkAdd} />

          <ScrollView style={styles.formList} nestedScrollEnabled>
            {state.form.map((entry, index) => (
              <View
                key={entry.id}
                style={[
                  styles.formRow,
                  state.isPlaying && state.currentFormIndex === index && styles.formRowActive,
                ]}
              >
                <Text style={styles.formRowNum}>{index + 1}</Text>
                <Text
                  style={[
                    styles.formRowMeter,
                    state.isPlaying && state.currentFormIndex === index && styles.formRowMeterActive,
                  ]}
                >
                  {entry.beats}/{entry.unit}
                </Text>
                <View style={{ flex: 1 }} />
                {state.form.length > 1 && (
                  <TouchableOpacity onPress={() => deleteMeasure(index)} style={styles.formDeleteBtn}>
                    <Text style={styles.formDeleteText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.addBtn} onPress={addMeasure} activeOpacity={0.7}>
            <Text style={styles.addBtnText}>+ Add Single Measure</Text>
          </TouchableOpacity>

          <Text style={styles.formCounter}>
            {state.isPlaying && state.currentFormIndex >= 0
              ? `Measure ${state.currentFormIndex + 1} of ${state.form.length}`
              : `${state.form.length} measure${state.form.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
      )}
    </View>
  );
}

function BulkAddRow({ onBulkAdd }: { onBulkAdd: (count: number, beats: number, unit: number) => void }) {
  const [count, setCount] = React.useState(4);
  const [beats, setBeats] = React.useState(4);
  const [unit, setUnit] = React.useState(4);

  return (
    <View style={styles.bulkRow}>
      <Text style={styles.bulkLabel}>Add</Text>
      <Stepper value={count} min={1} max={64} onChange={setCount} />
      <Text style={styles.bulkLabel}>×</Text>
      <Stepper value={beats} min={1} max={32} onChange={setBeats} />
      <Text style={[styles.bulkLabel, { fontSize: 18 }]}>/</Text>
      <Stepper value={unit} min={1} max={32} onChange={setUnit} />
      <TouchableOpacity
        style={styles.bulkAddBtn}
        onPress={() => onBulkAdd(count, beats, unit)}
        activeOpacity={0.7}
      >
        <Text style={styles.bulkAddText}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity onPress={() => value > min && onChange(value - 1)} style={styles.stepperBtn}>
        <Text style={styles.stepperBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={styles.stepperVal}>{value}</Text>
      <TouchableOpacity onPress={() => value < max && onChange(value + 1)} style={styles.stepperBtn}>
        <Text style={styles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// MARK: - Shared Slider Row

function SliderRow({
  label, value, min, max, unit, onChange,
}: {
  label: string; value: number; min: number; max: number; unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.sliderRow}>
      <Text style={styles.sliderLabel}>{label}</Text>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={value}
        onValueChange={(v) => onChange(Math.round(v))}
        minimumTrackTintColor={Colors.accentBlue}
        maximumTrackTintColor={Colors.sliderTrack}
        thumbTintColor={Colors.sliderThumb}
      />
      <Text style={styles.sliderValue}>{value}</Text>
      <Text style={styles.sliderUnit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  featureInfo: { flex: 1 },
  featureDesc: { color: '#484878', fontSize: 11, lineHeight: 15, marginTop: 2 },
  controlsArea: { marginTop: 8 },

  // Slider row
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sliderLabel: { color: Colors.textSecondary, fontSize: 12, width: 72 },
  slider: { flex: 1, height: 36 },
  sliderValue: { color: Colors.accentBlueBright, fontSize: 14, fontWeight: '600', width: 28, textAlign: 'right' },
  sliderUnit: { color: Colors.textDim, fontSize: 10, width: 54 },

  // Gap phase pill
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: { fontSize: 11, fontWeight: '600' },
  phaseProgress: { color: Colors.textDim, fontSize: 11 },

  // Form
  formList: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#22224a',
    borderRadius: 8,
    marginBottom: 8,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  formRowActive: {
    backgroundColor: 'rgba(96,96,255,0.15)',
  },
  formRowNum: { color: Colors.textDim, fontSize: 11, width: 28, textAlign: 'right' },
  formRowMeter: { color: Colors.textSecondary, fontSize: 15, fontWeight: '700' },
  formRowMeterActive: { color: Colors.accentBlueBright },
  formDeleteBtn: { padding: 4 },
  formDeleteText: { color: Colors.textDim, fontSize: 12 },
  addBtn: {
    backgroundColor: Colors.btnBg,
    borderColor: Colors.btnBorder,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  addBtnText: { color: Colors.textDim, fontSize: 13 },
  formCounter: { color: Colors.textDim, fontSize: 11, textAlign: 'center' },

  // Bulk add
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  bulkLabel: { color: Colors.textSecondary, fontSize: 12 },
  bulkAddBtn: {
    backgroundColor: Colors.btnBg,
    borderColor: Colors.btnBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bulkAddText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '500' },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.btnBg,
    borderColor: Colors.btnBorder,
    borderWidth: 1,
    borderRadius: 6,
  },
  stepperBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  stepperBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '700' },
  stepperVal: { color: Colors.accentBlueBright, fontSize: 13, fontWeight: '600', minWidth: 22, textAlign: 'center' },
});
