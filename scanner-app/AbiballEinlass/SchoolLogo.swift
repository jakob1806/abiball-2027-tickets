import SwiftUI

/// Nachbau des Schul-Logos wie auf der Website: Staatswappen + Schriftzug in Serifenschrift.
struct SchoolLogo: View {
    enum Layout { case stacked, inline }
    var layout: Layout = .stacked
    var size: CGFloat = 17

    var body: some View {
        switch layout {
        case .stacked:
            VStack(spacing: size * 0.6) {
                crest.frame(height: size * 4.2)
                text(alignment: .center)
            }
        case .inline:
            HStack(spacing: size * 0.7) {
                crest.frame(height: size * 2.6)
                Rectangle().fill(Color.black.opacity(0.15)).frame(width: 1, height: size * 2.2)
                text(alignment: .leading)
            }
        }
    }

    private var crest: some View {
        Image("Wappen").resizable().interpolation(.high).scaledToFit()
            .accessibilityHidden(true)
    }

    private func text(alignment: HorizontalAlignment) -> some View {
        VStack(alignment: alignment, spacing: size * 0.15) {
            Text("WITTELSBACHER-GYMNASIUM")
                .font(.system(size: size, weight: .medium, design: .serif))
                .tracking(size * 0.05)
            Text("MÜNCHEN")
                .font(.system(size: size * 0.78, weight: .medium, design: .serif))
                .tracking(size * 0.12)
        }
        .foregroundStyle(Color(white: 0.1))
        .lineLimit(1)
        .minimumScaleFactor(0.6)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Wittelsbacher-Gymnasium München")
    }
}

/// Eigene Kopfzeile: kleines Logo links, Titel groß, Konto-Button rechts.
struct ScreenHeader: View {
    let title: String
    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            Image("Wappen").resizable().interpolation(.high).scaledToFit().frame(height: 44)
            VStack(alignment: .leading, spacing: 0) {
                Text("ABIBALL 2027")
                    .font(.system(size: 12, weight: .semibold, design: .serif))
                    .tracking(1.5)
                    .foregroundStyle(.secondary)
                Text(title).font(.system(size: 30, weight: .bold)).lineLimit(1).minimumScaleFactor(0.7)
            }
            Spacer()
            AccountMenu()
        }
    }
}
