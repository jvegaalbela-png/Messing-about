import SwiftUI

struct TimeSignatureSection: View {
    @Bindable var state: MetronomeState

    private let presets: [(beats: Int, unit: Int)] = [
        (2, 4), (3, 4), (4, 4), (5, 4), (6, 4),
        (7, 4), (6, 8), (7, 8), (9, 8), (12, 8)
    ]

    var body: some View {
        CardView {
            SectionLabel("Time Signature")

            // Presets grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 5), spacing: 8) {
                ForEach(presets, id: \.beats) { preset in
                    let isActive = state.beatsPerMeasure == preset.beats && state.beatUnit == preset.unit
                    Button("\(preset.beats)/\(preset.unit)") {
                        state.setTimeSig(beats: preset.beats, unit: preset.unit)
                    }
                    .buttonStyle(MetronomeButtonStyle(isActive: isActive))
                }
            }

            // Custom
            HStack(spacing: 8) {
                Text("Custom:")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textDim)

                Picker("Beats", selection: Binding(
                    get: { state.beatsPerMeasure },
                    set: { state.setTimeSig(beats: $0, unit: state.beatUnit) }
                )) {
                    ForEach(1...32, id: \.self) { n in
                        Text("\(n)").tag(n)
                    }
                }
                .pickerStyle(.menu)
                .tint(Theme.accentBlueBright)

                Text("/")
                    .font(.system(size: 22, weight: .light))
                    .foregroundColor(Theme.textDim)

                Picker("Unit", selection: Binding(
                    get: { state.beatUnit },
                    set: { state.setTimeSig(beats: state.beatsPerMeasure, unit: $0) }
                )) {
                    ForEach([1, 2, 4, 8, 16, 32], id: \.self) { n in
                        Text("\(n)").tag(n)
                    }
                }
                .pickerStyle(.menu)
                .tint(Theme.accentBlueBright)
            }
        }
    }
}
