import SwiftUI

enum Theme {
    static let background = Color(red: 0.051, green: 0.051, blue: 0.102)
    static let cardBg = Color(red: 0.075, green: 0.075, blue: 0.165)
    static let cardBorder = Color(red: 0.145, green: 0.145, blue: 0.29)
    static let textPrimary = Color(red: 0.878, green: 0.878, blue: 1.0)
    static let textSecondary = Color(red: 0.565, green: 0.565, blue: 0.816)
    static let textDim = Color(red: 0.314, green: 0.314, blue: 0.565)
    static let accentBlue = Color(red: 0.376, green: 0.376, blue: 1.0)
    static let accentBlueBright = Color(red: 0.5, green: 0.5, blue: 1.0)
    static let gold = Color(red: 1.0, green: 0.784, blue: 0.251)
    static let goldDim = Color(red: 0.69, green: 0.5, blue: 0.0)
    static let btnBg = Color(red: 0.118, green: 0.118, blue: 0.251)
    static let btnBorder = Color(red: 0.208, green: 0.208, blue: 0.416)
    static let btnActiveBg = Color(red: 0.208, green: 0.208, blue: 0.541)
    static let btnActiveBorder = Color(red: 0.396, green: 0.396, blue: 0.8)
    static let playBg = Color(red: 0.208, green: 0.208, blue: 0.627)
    static let playBorder = Color(red: 0.333, green: 0.333, blue: 0.816)
    static let stopBg = Color(red: 0.541, green: 0.125, blue: 0.251)
    static let stopBorder = Color(red: 0.753, green: 0.251, blue: 0.376)
    static let muteBg = Color(red: 0.078, green: 0.078, blue: 0.157)
    static let muteBorder = Color(red: 0.145, green: 0.145, blue: 0.22)
    static let muteText = Color(red: 0.22, green: 0.22, blue: 0.345)
    static let greenPill = Color(red: 0.376, green: 0.753, blue: 0.376)
    static let redPill = Color(red: 0.753, green: 0.376, blue: 0.376)
}

// MARK: - Reusable Components

struct CardView<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            content()
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.cardBg)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Theme.cardBorder, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

struct SectionLabel: View {
    let text: String
    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 10, weight: .medium))
            .tracking(3)
            .foregroundColor(Theme.textDim)
    }
}

struct MetronomeButtonStyle: ButtonStyle {
    var isActive: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(isActive ? Theme.accentBlueBright : Theme.textSecondary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isActive ? Theme.btnActiveBg : Theme.btnBg)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(isActive ? Theme.btnActiveBorder : Theme.btnBorder, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeOut(duration: 0.08), value: configuration.isPressed)
    }
}

struct PlayButtonStyle: ButtonStyle {
    let isPlaying: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 18, weight: .semibold))
            .tracking(1.5)
            .foregroundColor(.white)
            .padding(.horizontal, 32)
            .padding(.vertical, 14)
            .background(isPlaying ? Theme.stopBg : Theme.playBg)
            .overlay(
                Capsule()
                    .stroke(isPlaying ? Theme.stopBorder : Theme.playBorder, lineWidth: 1)
            )
            .clipShape(Capsule())
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeOut(duration: 0.08), value: configuration.isPressed)
    }
}
