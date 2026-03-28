import SwiftUI

struct SubdivisionSection: View {
    @Bindable var state: MetronomeState

    private let options: [(sub: Int, icon: String, label: String)] = [
        (1, "♩", "None"),
        (2, "♪♪", "Duplet"),
        (3, "♪♪♪", "Triplet"),
        (4, "♬♬", "Quadruplet"),
    ]

    var body: some View {
        CardView {
            SectionLabel("Subdivision")

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                ForEach(options, id: \.sub) { opt in
                    Button {
                        state.subdivision = opt.sub
                    } label: {
                        VStack(spacing: 4) {
                            Text(opt.icon)
                                .font(.system(size: 18))
                            Text(opt.label)
                                .font(.system(size: 9, weight: .medium))
                                .tracking(0.5)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                    }
                    .buttonStyle(MetronomeButtonStyle(isActive: state.subdivision == opt.sub))
                }
            }
        }
    }
}
