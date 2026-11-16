import SwiftUI

struct StatsBar: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            if let s = model.stats {
                HStack(alignment: .lastTextBaseline) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text("Drin").font(.caption.weight(.semibold)).foregroundStyle(.white.opacity(0.6)).textCase(.uppercase)
                        HStack(alignment: .lastTextBaseline, spacing: 6) {
                            Text("\(s.inside)").font(.system(size: 28, weight: .bold).monospacedDigit())
                            Text("/ \(s.sold)").font(.system(size: 15, weight: .semibold).monospacedDigit()).foregroundStyle(.white.opacity(0.6))
                        }
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        if model.statsError {
                            Label("offline", systemImage: "wifi.exclamationmark").font(.caption.weight(.bold)).foregroundStyle(.orange)
                        }
                        Text("\(s.missing) fehlen").font(.footnote.weight(.semibold))
                        Text("Kapazität \(s.capacity)").font(.caption).foregroundStyle(.white.opacity(0.6))
                    }
                }
                GeometryReader { geo in
                    let w = geo.size.width
                    let cap = Double(max(s.capacity, 1))
                    ZStack(alignment: .leading) {
                        Capsule().fill(Color.white.opacity(0.15))
                        Capsule().fill(Color.white.opacity(0.35)).frame(width: w * min(1, Double(s.sold) / cap))
                        Capsule().fill(Color.white).frame(width: w * min(1, Double(s.inside) / cap))
                    }
                }
                .frame(height: 4)
                HStack(spacing: 8) {
                    ForEach(s.perType) { t in
                        HStack(spacing: 8) {
                            TicketBadge(typeId: t.id, name: t.name, onColor: true)
                            Text("\(t.inside)/\(t.sold)").font(.footnote.monospacedDigit().weight(.semibold))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            } else {
                HStack(spacing: 10) {
                    ProgressView().tint(.white)
                    Text(model.statsError ? "Zahlen nicht erreichbar" : "Lade Zahlen …").font(.subheadline)
                }
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 14).padding(.vertical, 11)
        .background(RoundedRectangle(cornerRadius: 18).fill(Color.black))
    }
}
