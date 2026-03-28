import SwiftUI

struct ContentView: View {
    @State private var state = MetronomeState()
    @State private var engine = MetronomeEngine()

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                header
                TempoSection(state: state, onTogglePlay: togglePlay)
                TimeSignatureSection(state: state)
                SubdivisionSection(state: state)
                SoundSection(state: state)
                BeatGridSection(state: state)
                advancedToggle
                if state.advancedEnabled {
                    AdvancedSection(state: state)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 48)
        }
        .background(Theme.background.ignoresSafeArea())
        .onAppear {
            engine.state = state
            state.initFormHistory()
        }
        .task {
            // Sync engine config at ~30 Hz while playing
            while !Task.isCancelled {
                if state.isPlaying {
                    engine.updateConfig(from: state)
                }
                try? await Task.sleep(for: .milliseconds(33))
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 12) {
            beatFlash
            Text("METRONOME")
                .font(.system(size: 22, weight: .light))
                .tracking(6)
                .foregroundColor(Theme.textSecondary)
            beatFlash
        }
        .padding(.vertical, 8)
    }

    private var beatFlash: some View {
        Circle()
            .fill(flashColor)
            .frame(width: 16, height: 16)
            .overlay(
                Circle().stroke(flashBorderColor, lineWidth: 2)
            )
            .shadow(color: flashShadow, radius: flashActive ? 8 : 0)
            .animation(.easeOut(duration: 0.05), value: state.currentBeat)
    }

    private var flashActive: Bool {
        state.isPlaying && state.currentBeat >= 0 && state.currentSub == 0
            && state.currentClickType != .mute
    }

    private var flashColor: Color {
        guard flashActive else { return Color(red: 0.165, green: 0.165, blue: 0.314) }
        return state.currentClickType == .accent ? Theme.gold : Theme.accentBlue
    }

    private var flashBorderColor: Color {
        guard flashActive else { return Color(red: 0.251, green: 0.251, blue: 0.627) }
        return state.currentClickType == .accent
            ? Theme.gold.opacity(0.9) : Theme.accentBlueBright
    }

    private var flashShadow: Color {
        guard flashActive else { return .clear }
        return state.currentClickType == .accent
            ? Theme.gold.opacity(0.5) : Theme.accentBlue.opacity(0.5)
    }

    // MARK: - Advanced Toggle

    private var advancedToggle: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.3)) {
                state.advancedEnabled.toggle()
            }
        } label: {
            HStack(spacing: 12) {
                Text("~  A D V A N C E D   M O D E  ~")
                    .font(.system(size: 10, weight: .medium))
                    .tracking(3)
                    .foregroundColor(state.advancedEnabled ? Theme.textSecondary : Theme.textDim)
                Toggle("", isOn: $state.advancedEnabled)
                    .labelsHidden()
                    .tint(Theme.accentBlue)
            }
        }
        .padding(.vertical, 8)
    }

    // MARK: - Play/Stop

    private func togglePlay() {
        state.isPlaying.toggle()
        if state.isPlaying {
            engine.updateConfig(from: state)
            engine.start()
        } else {
            engine.stop()
        }
    }
}

#Preview {
    ContentView()
}
