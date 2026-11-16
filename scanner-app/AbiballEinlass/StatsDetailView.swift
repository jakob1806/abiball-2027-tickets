import SwiftUI

/// Detailansicht der Kapazität (Popup nach Tippen auf die Zahlen oben).
struct StatsDetailView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if let s = model.stats {
                    Section {
                        HStack(spacing: 18) {
                            ring(inside: s.inside, total: s.sold, size: 84)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(s.inside) drin").font(.title2.bold().monospacedDigit())
                                Text("von \(s.sold) verkauften Tickets").foregroundStyle(.secondary)
                                Text("\(s.missing) fehlen noch").font(.subheadline.weight(.semibold))
                            }
                        }
                        .padding(.vertical, 6)
                    }
                    Section("Nach Ticketart") {
                        ForEach(s.perType) { t in
                            VStack(alignment: .leading, spacing: 6) {
                                HStack {
                                    TicketBadge(typeId: t.id, name: t.name)
                                    Spacer()
                                    Text("\(t.inside) / \(t.sold)").monospacedDigit().foregroundStyle(.secondary)
                                }
                                ProgressView(value: Double(t.inside), total: Double(max(t.sold, 1))).tint(.primary)
                                Text("\(t.sold - t.inside) fehlen").font(.caption).foregroundStyle(.secondary)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    Section("Veranstaltung") {
                        LabeledContent("Kapazität", value: "\(s.capacity)")
                        LabeledContent("Verkauft", value: "\(s.sold)")
                        LabeledContent("Freie Plätze", value: "\(max(0, s.capacity - s.sold))")
                        if let u = Fmt.time(s.updatedAt) {
                            LabeledContent("Stand", value: u)
                        }
                    }
                } else {
                    Text(model.statsError ? "Zahlen nicht erreichbar" : "Lade …").foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Einlass-Stand")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Fertig") { dismiss() } }
            }
            .refreshable { await model.refreshStats() }
        }
    }

    private func ring(inside: Int, total: Int, size: CGFloat) -> some View {
        ZStack {
            Circle().stroke(Color.primary.opacity(0.12), lineWidth: 8)
            Circle().trim(from: 0, to: total > 0 ? min(1, Double(inside) / Double(total)) : 0)
                .stroke(Color.primary, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text(total > 0 ? "\(Int(Double(inside) / Double(total) * 100)) %" : "–").font(.headline.monospacedDigit())
        }
        .frame(width: size, height: size)
    }
}
