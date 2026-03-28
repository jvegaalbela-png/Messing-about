import SwiftUI

struct BeatGridSection: View {
    @Bindable var state: MetronomeState

    var body: some View {
        CardView {
            SectionLabel("Beats")

            // Beat circles
            let columns = adaptiveColumns(for: displayStates.count)
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(Array(displayStates.enumerated()), id: \.offset) { index, beatState in
                    BeatCircle(
                        number: index + 1,
                        beatState: beatState,
                        isActive: state.isPlaying && state.currentBeat == index && state.currentSub == 0
                    ) {
                        cycleBeatState(at: index)
                    }
                }
            }

            // Sub-beat dots
            if state.subdivision > 1 {
                HStack(spacing: 6) {
                    Spacer()
                    ForEach(0..<state.subdivision, id: \.self) { i in
                        Circle()
                            .fill(subDotColor(index: i))
                            .frame(width: 10, height: 10)
                            .overlay(
                                Circle().stroke(subDotBorder(index: i), lineWidth: 1)
                            )
                    }
                    Spacer()
                }
                .padding(.top, 4)
            }

            // Hint
            Text("Tap a beat to cycle: Normal → Accent → Mute")
                .font(.system(size: 10))
                .foregroundColor(Theme.textDim)
                .frame(maxWidth: .infinity)
                .padding(.top, 4)
        }
    }

    private var displayStates: [BeatState] {
        if state.formEnabled && !state.form.isEmpty {
            let idx = max(0, min(state.currentFormIndex, state.form.count - 1))
            return state.form[idx].states
        }
        return state.beatStates
    }

    private func cycleBeatState(at index: Int) {
        if state.formEnabled && !state.form.isEmpty {
            let fi = max(0, min(state.currentFormIndex, state.form.count - 1))
            if index < state.form[fi].states.count {
                state.form[fi].states[index] = state.form[fi].states[index].next
            }
        } else if index < state.beatStates.count {
            state.beatStates[index] = state.beatStates[index].next
        }
    }

    private func subDotColor(index: Int) -> Color {
        guard state.isPlaying && state.currentSub == index else {
            return Color(red: 0.125, green: 0.125, blue: 0.29)
        }
        return state.currentClickType == .accent
            ? Color(red: 0.753, green: 0.565, blue: 0) : Theme.accentBlue
    }

    private func subDotBorder(index: Int) -> Color {
        guard state.isPlaying && state.currentSub == index else {
            return Theme.btnBorder
        }
        return state.currentClickType == .accent ? Theme.gold : Theme.accentBlueBright
    }

    private func adaptiveColumns(for count: Int) -> [GridItem] {
        let cols = min(count, count <= 4 ? count : (count <= 8 ? 4 : 6))
        return Array(repeating: GridItem(.flexible(), spacing: 10), count: max(1, cols))
    }
}

// MARK: - Beat Circle

struct BeatCircle: View {
    let number: Int
    let beatState: BeatState
    let isActive: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 2) {
                Text("\(number)")
                    .font(.system(size: 20, weight: .bold))
                Text(beatState.icon)
                    .font(.system(size: 10))
                    .opacity(0.7)
            }
            .frame(width: 60, height: 60)
            .foregroundColor(foreground)
            .background(background)
            .clipShape(Circle())
            .overlay(Circle().stroke(border, lineWidth: isActive ? 3 : 2))
            .shadow(color: shadow, radius: isActive ? 12 : 0)
            .scaleEffect(isActive ? 1.12 : 1.0)
            .animation(.easeOut(duration: 0.08), value: isActive)
        }
        .buttonStyle(.plain)
    }

    private var foreground: Color {
        switch beatState {
        case .normal: return isActive ? Theme.accentBlueBright : Theme.textSecondary
        case .accent: return isActive ? Color(red: 1, green: 0.878, blue: 0.439) : Theme.gold
        case .mute: return Theme.muteText
        }
    }

    private var background: Color {
        switch beatState {
        case .normal: return isActive ? Color(red: 0.145, green: 0.145, blue: 0.416) : Theme.btnBg
        case .accent: return isActive ? Color(red: 0.227, green: 0.18, blue: 0) : Color(red: 0.165, green: 0.125, blue: 0)
        case .mute: return Theme.muteBg
        }
    }

    private var border: Color {
        switch beatState {
        case .normal: return isActive ? Theme.accentBlueBright : Color(red: 0.251, green: 0.251, blue: 0.502)
        case .accent: return isActive ? Theme.gold : Theme.goldDim
        case .mute: return isActive ? Color(red: 0.251, green: 0.251, blue: 0.333) : Theme.muteBorder
        }
    }

    private var shadow: Color {
        guard isActive else { return .clear }
        switch beatState {
        case .normal: return Theme.accentBlue.opacity(0.4)
        case .accent: return Theme.gold.opacity(0.4)
        case .mute: return .clear
        }
    }
}
