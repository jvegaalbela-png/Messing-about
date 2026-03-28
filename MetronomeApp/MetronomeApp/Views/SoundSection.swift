import SwiftUI

struct SoundSection: View {
    @Bindable var state: MetronomeState

    var body: some View {
        CardView {
            SectionLabel("Sound")

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(SoundMode.allCases, id: \.self) { mode in
                    Button {
                        state.soundMode = mode
                    } label: {
                        VStack(spacing: 6) {
                            Text(mode.icon)
                                .font(.system(size: 20))
                            Text(mode.rawValue)
                                .font(.system(size: 10, weight: .medium))
                                .tracking(0.5)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                    }
                    .buttonStyle(MetronomeButtonStyle(isActive: state.soundMode == mode))
                }
            }
        }
    }
}
