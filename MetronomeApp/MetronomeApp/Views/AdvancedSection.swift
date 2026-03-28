import SwiftUI
import UniformTypeIdentifiers

struct AdvancedSection: View {
    @Bindable var state: MetronomeState

    var body: some View {
        GapClickCard(state: state)
        RandomMuteCard(state: state)
        CustomFormCard(state: state)
    }
}

// MARK: - Gap Click

private struct GapClickCard: View {
    @Bindable var state: MetronomeState

    var body: some View {
        CardView {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    SectionLabel("Gap Click")
                    Text("Play for N measures, then silence for M — trains your internal clock")
                        .font(.system(size: 11))
                        .foregroundColor(Theme.textDim)
                }
                Spacer()
                Toggle("", isOn: $state.gapEnabled)
                    .labelsHidden()
                    .tint(Theme.accentBlue)
            }

            if state.gapEnabled {
                VStack(spacing: 10) {
                    sliderRow(label: "Play", value: $state.gapPlay, range: 1...16, unit: "measures")
                    sliderRow(label: "Silence", value: $state.gapSilent, range: 1...16, unit: "measures")

                    // Phase indicator
                    HStack(spacing: 8) {
                        phasePill
                        if state.isPlaying && state.gapPhase != .idle {
                            Text(phaseProgress)
                                .font(.system(size: 11))
                                .foregroundColor(Theme.textDim)
                        }
                        Spacer()
                    }
                }
            }
        }
    }

    private var phasePill: some View {
        let (text, color): (String, Color) = {
            switch state.gapPhase {
            case .idle: return ("● Waiting", Theme.textDim)
            case .play: return ("▶ Playing", Theme.greenPill)
            case .silent: return ("● Silent", Theme.redPill)
            }
        }()

        return Text(text)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(color.opacity(0.4), lineWidth: 1))
    }

    private var phaseProgress: String {
        let total: Int
        let count: Int
        switch state.gapPhase {
        case .play:
            total = state.gapPlay
            count = state.gapMeasureCount
        case .silent:
            total = state.gapSilent
            count = state.gapMeasureCount
        case .idle:
            return ""
        }
        let left = max(0, total - count)
        return "\(left) measure\(left != 1 ? "s" : "") left"
    }
}

// MARK: - Random Mute

private struct RandomMuteCard: View {
    @Bindable var state: MetronomeState

    var body: some View {
        CardView {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    SectionLabel("Random Mute")
                    Text("Each beat has a chance of being silenced at random")
                        .font(.system(size: 11))
                        .foregroundColor(Theme.textDim)
                }
                Spacer()
                Toggle("", isOn: $state.randomMuteEnabled)
                    .labelsHidden()
                    .tint(Theme.accentBlue)
            }

            if state.randomMuteEnabled {
                sliderRow(
                    label: "Probability",
                    value: $state.randomMutePct,
                    range: 0...100,
                    unit: "%"
                )
            }
        }
    }
}

// MARK: - Custom Form

private struct CustomFormCard: View {
    @Bindable var state: MetronomeState
    @State private var bulkCount: Int = 4
    @State private var bulkBeats: Int = 4
    @State private var bulkUnit: Int = 4
    @State private var showExporter = false
    @State private var showImporter = false

    var body: some View {
        CardView {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    SectionLabel("Custom Form")
                    Text("Up to 256 measures with shifting time signatures, looping continuously")
                        .font(.system(size: 11))
                        .foregroundColor(Theme.textDim)
                }
                Spacer()
                Toggle("", isOn: $state.formEnabled)
                    .labelsHidden()
                    .tint(Theme.accentBlue)
            }

            if state.formEnabled {
                // Toolbar
                HStack(spacing: 6) {
                    Button("↩ Undo") { state.undoForm() }
                        .buttonStyle(MetronomeButtonStyle())
                        .disabled(!state.canUndoForm)
                        .opacity(state.canUndoForm ? 1 : 0.3)
                    Button("↪ Redo") { state.redoForm() }
                        .buttonStyle(MetronomeButtonStyle())
                        .disabled(!state.canRedoForm)
                        .opacity(state.canRedoForm ? 1 : 0.3)
                    Spacer()
                    Button("↓ Save") { saveForm() }
                        .buttonStyle(MetronomeButtonStyle())
                    Button("↑ Load") { showImporter = true }
                        .buttonStyle(MetronomeButtonStyle())
                }

                // Bulk add
                HStack(spacing: 6) {
                    Text("Add")
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textSecondary)
                    compactStepper(value: $bulkCount, range: 1...64)
                    Text("×")
                        .foregroundColor(Theme.textDim)
                    compactStepper(value: $bulkBeats, range: 1...32)
                    Text("/")
                        .font(.system(size: 18))
                        .foregroundColor(Theme.textDim)
                    Picker("", selection: $bulkUnit) {
                        ForEach([1, 2, 4, 8, 16, 32], id: \.self) { Text("\($0)").tag($0) }
                    }
                    .pickerStyle(.menu)
                    .tint(Theme.accentBlueBright)
                    Button("+ Add") { bulkAdd() }
                        .buttonStyle(MetronomeButtonStyle())
                }

                // Form list
                ScrollView {
                    LazyVStack(spacing: 4) {
                        ForEach(Array(state.form.enumerated()), id: \.element.id) { index, entry in
                            formRow(entry: entry, index: index)
                        }
                    }
                }
                .frame(maxHeight: 250)
                .background(Color(red: 0.04, green: 0.04, blue: 0.09))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.cardBorder, lineWidth: 1))

                // Add single measure
                Button {
                    state.addFormMeasure()
                } label: {
                    HStack {
                        Spacer()
                        Text("+ Add Single Measure")
                            .font(.system(size: 13))
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                .buttonStyle(MetronomeButtonStyle())

                // Counter
                Text(formCounterText)
                    .font(.system(size: 11))
                    .foregroundColor(Theme.textDim)
                    .frame(maxWidth: .infinity)
            }
        }
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.json]) { result in
            loadForm(result: result)
        }
    }

    private func formRow(entry: FormEntry, index: Int) -> some View {
        HStack(spacing: 8) {
            Text("\(index + 1)")
                .font(.system(size: 11))
                .foregroundColor(Theme.textDim)
                .frame(width: 28, alignment: .trailing)

            Text("\(entry.beats)/\(entry.unit)")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(
                    state.isPlaying && state.currentFormIndex == index
                        ? Theme.accentBlueBright : Theme.textSecondary
                )

            Spacer()

            if state.form.count > 1 {
                Button {
                    state.deleteFormEntry(at: index)
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11))
                        .foregroundColor(Theme.textDim)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
            state.isPlaying && state.currentFormIndex == index
                ? Theme.accentBlue.opacity(0.15) : Color.clear
        )
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private var formCounterText: String {
        if state.form.isEmpty { return "" }
        if state.isPlaying && state.currentFormIndex >= 0 {
            return "Measure \(state.currentFormIndex + 1) of \(state.form.count)"
        }
        return "\(state.form.count) measure\(state.form.count != 1 ? "s" : "")"
    }

    private func bulkAdd() {
        let slots = min(bulkCount, 256 - state.form.count)
        guard slots > 0 else { return }
        state.saveFormSnapshot()
        for _ in 0..<slots {
            var states = Array(repeating: BeatState.normal, count: bulkBeats)
            if !states.isEmpty { states[0] = .accent }
            state.form.append(FormEntry(beats: bulkBeats, unit: bulkUnit, states: states))
        }
    }

    private func saveForm() {
        let payload: [String: Any] = [
            "version": 1,
            "form": state.form.map { entry -> [String: Any] in
                ["beats": entry.beats, "unit": entry.unit,
                 "states": entry.states.map(\.rawValue)]
            }
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: .prettyPrinted) else { return }

        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("metronome-form.json")
        try? data.write(to: tempURL)

        let ac = UIActivityViewController(activityItems: [tempURL], applicationActivities: nil)
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let root = windowScene.windows.first?.rootViewController {
            root.present(ac, animated: true)
        }
    }

    private func loadForm(result: Result<URL, Error>) {
        guard case .success(let url) = result,
              url.startAccessingSecurityScopedResource() else { return }
        defer { url.stopAccessingSecurityScopedResource() }

        guard let data = try? Data(contentsOf: url),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              json["version"] as? Int == 1,
              let formArray = json["form"] as? [[String: Any]] else { return }

        state.saveFormSnapshot()
        state.form = formArray.prefix(256).compactMap { dict -> FormEntry? in
            guard let beats = dict["beats"] as? Int,
                  let unit = dict["unit"] as? Int else { return nil }
            let b = max(1, min(32, beats))
            let u = max(1, min(32, unit))
            let rawStates = dict["states"] as? [String] ?? []
            var states = rawStates.prefix(b).compactMap { BeatState(rawValue: $0) }
            while states.count < b { states.append(.normal) }
            return FormEntry(beats: b, unit: u, states: states)
        }
        if state.form.isEmpty {
            state.form = [FormEntry()]
        }
    }

    private func compactStepper(value: Binding<Int>, range: ClosedRange<Int>) -> some View {
        HStack(spacing: 0) {
            Button {
                if value.wrappedValue > range.lowerBound { value.wrappedValue -= 1 }
            } label: {
                Text("−").font(.system(size: 14, weight: .bold))
                    .frame(width: 28, height: 28)
            }
            Text("\(value.wrappedValue)")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.accentBlueBright)
                .frame(width: 30)
            Button {
                if value.wrappedValue < range.upperBound { value.wrappedValue += 1 }
            } label: {
                Text("+").font(.system(size: 14, weight: .bold))
                    .frame(width: 28, height: 28)
            }
        }
        .foregroundColor(Theme.textSecondary)
        .background(Theme.btnBg)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(Theme.btnBorder, lineWidth: 1))
    }
}

// MARK: - Shared Slider Row

private func sliderRow(label: String, value: Binding<Int>, range: ClosedRange<Int>, unit: String) -> some View {
    HStack(spacing: 8) {
        Text(label)
            .font(.system(size: 12))
            .foregroundColor(Theme.textSecondary)
            .frame(width: 72, alignment: .leading)

        Slider(
            value: Binding(
                get: { Double(value.wrappedValue) },
                set: { value.wrappedValue = Int($0) }
            ),
            in: Double(range.lowerBound)...Double(range.upperBound),
            step: 1
        )
        .tint(Theme.accentBlue)

        Text("\(value.wrappedValue)")
            .font(.system(size: 14, weight: .semibold))
            .foregroundColor(Theme.accentBlueBright)
            .frame(width: 28, alignment: .trailing)

        Text(unit)
            .font(.system(size: 10))
            .foregroundColor(Theme.textDim)
            .frame(width: 60, alignment: .leading)
    }
}
