import SwiftUI

struct TempoSection: View {
    @Bindable var state: MetronomeState
    let onTogglePlay: () -> Void

    var body: some View {
        CardView {
            SectionLabel("Tempo")

            // BPM display with +/- buttons
            HStack(alignment: .center) {
                VStack(spacing: 8) {
                    stepButton("−1") { state.setBPM(state.bpm - 1) }
                    stepButton("−5") { state.setBPM(state.bpm - 5) }
                }

                Spacer()

                VStack(spacing: 2) {
                    Text("\(Int(state.bpm))")
                        .font(.system(size: 64, weight: .bold, design: .default))
                        .foregroundColor(.white)
                        .contentTransition(.numericText())
                        .animation(.easeOut(duration: 0.1), value: Int(state.bpm))
                    Text("BPM")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(3)
                        .foregroundColor(Theme.textDim)
                    Text(state.tempoName)
                        .font(.system(size: 10, weight: .medium))
                        .tracking(3)
                        .foregroundColor(Theme.textSecondary)
                        .animation(.easeInOut(duration: 0.3), value: state.tempoName)
                }

                Spacer()

                VStack(spacing: 8) {
                    stepButton("+1") { state.setBPM(state.bpm + 1) }
                    stepButton("+5") { state.setBPM(state.bpm + 5) }
                }
            }
            .padding(.horizontal, 12)

            // Slider
            HStack(spacing: 8) {
                Text("1")
                    .font(.system(size: 11))
                    .foregroundColor(Theme.textDim)
                Slider(value: $state.bpm, in: 1...500, step: 1)
                    .tint(Theme.accentBlue)
                Text("500")
                    .font(.system(size: 11))
                    .foregroundColor(Theme.textDim)
            }

            // Tap Tempo
            HStack {
                Spacer()
                Button("Tap Tempo") {
                    state.tapTempo()
                }
                .buttonStyle(MetronomeButtonStyle())
                Spacer()
            }

            // Play / Stop
            HStack {
                Spacer()
                Button(state.isPlaying ? "■  Stop" : "▶  Start") {
                    onTogglePlay()
                }
                .buttonStyle(PlayButtonStyle(isPlaying: state.isPlaying))
                Spacer()
            }
            .padding(.top, 4)
        }
    }

    private func stepButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(label) { action() }
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(Theme.textSecondary)
            .frame(width: 48, height: 36)
            .background(Theme.btnBg)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.btnBorder, lineWidth: 1))
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
