import SwiftUI

/// Kapazitätsanzeige: Ring mit „drin“, daneben Balken je Ticketart.
struct StatsBar: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        HStack(spacing: 16) {
            if let s = model.stats {
                ring(s)
                VStack(alignment: .leading, spacing: 9) {
                    ForEach(s.perType) { t in typeRow(t) }
                    HStack(spacing: 6) {
                        Text("\(s.missing) fehlen")
                        Text("·").foregroundStyle(.tertiary)
                        Text("Kapazität \(s.capacity)")
                        if model.statsError {
                            Image(systemName: "wifi.exclamationmark").foregroundStyle(.orange)
                                .accessibilityLabel("Zahlen nicht aktuell")
                        }
                    }
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                }
            } else {
                ProgressView()
                Text(model.statsError ? "Zahlen nicht erreichbar" : "Lade Zahlen …")
                    .font(.subheadline).foregroundStyle(.secondary)
                Spacer()
            }
        }
        .frame(minHeight: 78)
        .padding(.horizontal, 14).padding(.vertical, 12)
        .background(RoundedRectangle(cornerRadius: 20).fill(Color.white))
        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color.black.opacity(0.08)))
        .shadow(color: .black.opacity(0.05), radius: 10, y: 4)
    }

    private func ring(_ s: Stats) -> some View {
        let frac = s.sold > 0 ? Double(s.inside) / Double(s.sold) : 0
        return ZStack {
            Circle().stroke(Color.black.opacity(0.08), lineWidth: 7)
            Circle().trim(from: 0, to: min(1, frac))
                .stroke(Color.black, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeOut(duration: 0.4), value: frac)
            VStack(spacing: -2) {
                Text("\(s.inside)").font(.system(size: 22, weight: .bold).monospacedDigit())
                    .minimumScaleFactor(0.6)
                Text("von \(s.sold)").font(.system(size: 10, weight: .medium)).foregroundStyle(.secondary)
            }
            .padding(.horizontal, 8)
        }
        .frame(width: 76, height: 76)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(s.inside) von \(s.sold) drin")
    }

    private func typeRow(_ t: Stats.PerType) -> some View {
        let isAP = TicketKind(t.id) == .afterparty
        let frac = t.sold > 0 ? Double(t.inside) / Double(t.sold) : 0
        return VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(t.name).font(.subheadline.weight(.semibold))
                Spacer()
                Text("\(t.inside) / \(t.sold)").font(.subheadline.monospacedDigit()).foregroundStyle(.secondary)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.black.opacity(0.07))
                    Capsule().fill(isAP ? Color(white: 0.45) : Color.black)
                        .frame(width: max(0, geo.size.width * min(1, frac)))
                }
            }
            .frame(height: 5)
        }
    }
}
