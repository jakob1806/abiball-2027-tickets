import SwiftUI

struct GuestsView: View {
    @Environment(AppModel.self) private var model
    @State private var status = "missing"
    @State private var query = ""
    @State private var guests: [Guest] = []
    @State private var loading = false
    @State private var error: String?
    @State private var confirmGuest: Guest?
    @State private var lastResult: ScanOutcome?

    var body: some View {
        List {
            Section {
                Picker("Anzeige", selection: $status) {
                    Text("Noch nicht da").tag("missing")
                    Text("Drin").tag("in")
                    Text("Alle").tag("all")
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
            }
            if let lastResult {
                Section {
                    ResultCard(result: lastResult, onDismiss: { withAnimation { self.lastResult = nil } }, onRetry: {
                        if case .failure(_, .ticket(let id)) = lastResult, let g = guests.first(where: { $0.id == id }) { checkin(g) }
                    })
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
            }
            Section {
                if let error {
                    Label(error, systemImage: "wifi.exclamationmark").foregroundStyle(.red)
                } else if guests.isEmpty && !loading {
                    Text(query.isEmpty ? "Keine Gäste in dieser Liste." : "Niemand gefunden.")
                        .foregroundStyle(.secondary)
                }
                ForEach(guests) { g in row(g) }
            } header: {
                Text(loading && guests.isEmpty ? "Lade …" : "\(guests.count) \(guests.count == 1 ? "Gast" : "Gäste")")
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Noch nicht da")
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Name oder Ticketnummer")
        .autocorrectionDisabled()
        .toolbar { ToolbarItem(placement: .topBarTrailing) { AccountMenu() } }
        .refreshable { await load() }
        .task(id: "\(status)|\(query)") {
            try? await Task.sleep(for: .milliseconds(query.isEmpty ? 0 : 300))
            guard !Task.isCancelled else { return }
            await load()
        }
        .sheet(item: $confirmGuest) { g in
            ConfirmSheet(guest: g) {
                confirmGuest = nil
                checkin(g)
            } onCancel: {
                confirmGuest = nil
            }
            .presentationDetents([.height(confirmHeight(g))])
            .presentationCornerRadius(28)
            .presentationBackground(Color.white)
        }
    }

    /// Höhe des Bestätigungsblatts: mehr Platz, wenn Bändchen und Hinweis angezeigt werden.
    private func confirmHeight(_ g: Guest) -> CGFloat {
        guard let age = AgeGroup(g.age_group) else { return 340 }
        return age.hint == nil ? 400 : 440
    }

    private func row(_ g: Guest) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(g.holder_name).font(.headline)
                HStack(spacing: 8) {
                    Text(g.ticket_number ?? "–").font(.subheadline.monospacedDigit().weight(.semibold))
                    TicketBadge(typeId: g.ticket_type_id, name: nil)
                }
                AgeBandBadge(id: g.age_group, name: g.wristband_name, colorHex: g.wristband_color)
                if g.checked_in_at != nil {
                    let who = g.checked_in_by_label.map { " · \($0)" } ?? ""
                    Text("Drin seit \(Fmt.time(g.checked_in_at) ?? "–")\(who)")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            if g.checked_in_at == nil {
                Button("Einlassen") { confirmGuest = g }
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14).padding(.vertical, 8)
                    .background(Capsule().fill(Color.black))
                    .buttonStyle(.plain)
            } else {
                Image(systemName: "checkmark.circle.fill").font(.title2).foregroundStyle(.green)
            }
        }
        .padding(.vertical, 4)
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let r = try await model.call { try await $0.guests(status: status, q: query) }
            guests = r.guests
            error = nil
        } catch APIError.unauthorized {
        } catch {
            if !(error is CancellationError) { self.error = error.localizedDescription }
        }
    }

    private func checkin(_ g: Guest) {
        Task {
            let outcome: ScanOutcome
            do {
                outcome = .response(try await model.call { try await $0.checkin(ticketId: g.id) })
            } catch APIError.unauthorized {
                return
            } catch {
                outcome = .failure(error.localizedDescription, retry: .ticket(g.id))
            }
            Feedback.play(outcome.feedback)
            withAnimation { lastResult = outcome }
            await load()
            await model.refreshStats()
        }
    }
}

/// Bestätigung vor dem manuellen Einlass aus der Liste.
struct ConfirmSheet: View {
    let guest: Guest
    let onConfirm: () -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Text("Einlassen?").font(.subheadline.weight(.semibold)).foregroundStyle(.secondary)
                .padding(.top, 24)
            VStack(spacing: 10) {
                Text(guest.holder_name).font(.system(size: 26, weight: .bold)).multilineTextAlignment(.center)
                HStack(spacing: 8) {
                    Text(guest.ticket_number ?? "–").font(.headline.monospacedDigit())
                    TicketBadge(typeId: guest.ticket_type_id, name: nil)
                }
                if let age = AgeGroup(guest.age_group) {
                    AgeBandBadge(id: guest.age_group, name: guest.wristband_name, colorHex: guest.wristband_color, large: true)
                    if let hint = age.hint {
                        Text(hint).font(.subheadline.weight(.semibold)).multilineTextAlignment(.center)
                    }
                }
                if TicketKind(guest.ticket_type_id) == .afterparty {
                    Text("Nur Afterparty – Einlass ab 22:30 Uhr")
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(Capsule().fill(Color(white: 0.93)))
                }
            }
            Spacer(minLength: 0)
            VStack(spacing: 10) {
                Button("Einlassen", action: onConfirm).buttonStyle(BlackButtonStyle())
                Button("Abbrechen", action: onCancel).buttonStyle(BlackButtonStyle(inverted: true))
            }
        }
        .padding(.horizontal, 24).padding(.bottom, 12)
    }
}
