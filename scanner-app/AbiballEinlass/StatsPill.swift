import SwiftUI

/// Kompakte Kapazitätsanzeige als Glas-Kapsel über dem Kamerabild.
struct StatsPill: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        HStack(spacing: 12) {
            if let s = model.stats {
                ZStack {
                    Circle().stroke(.white.opacity(0.25), lineWidth: 3.5)
                    Circle().trim(from: 0, to: s.sold > 0 ? min(1, Double(s.inside) / Double(s.sold)) : 0)
                        .stroke(.white, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                }
                .frame(width: 30, height: 30)
                VStack(alignment: .leading, spacing: 0) {
                    Text("\(s.inside) von \(s.sold) drin").font(.subheadline.weight(.semibold).monospacedDigit())
                    Text(s.perType.map { "\($0.name) \($0.inside)/\($0.sold)" }.joined(separator: " · "))
                        .font(.caption.monospacedDigit()).foregroundStyle(.white.opacity(0.75))
                }
                if model.statsError {
                    Image(systemName: "wifi.exclamationmark").foregroundStyle(.orange)
                }
            } else {
                ProgressView().tint(.white)
                Text(model.statsError ? "Zahlen offline" : "Lade …").font(.subheadline)
            }
        }
        .foregroundStyle(.white)
        .padding(.leading, 8).padding(.trailing, 16).padding(.vertical, 8)
        .glassCapsule()
        .environment(\.colorScheme, .dark)
        .accessibilityElement(children: .combine)
    }
}
