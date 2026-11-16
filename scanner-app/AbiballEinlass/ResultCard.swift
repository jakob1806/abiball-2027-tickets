import SwiftUI

/// Scan-Ergebnis als ruhige Karte: Status oben, darunter Name, Ticket und Bändchen.
struct ResultCard: View {
    let result: ScanOutcome
    var onDismiss: (() -> Void)? = nil
    var onRetry: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Status
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 38, height: 38)
                    .background(Circle().fill(color))
                VStack(alignment: .leading, spacing: 1) {
                    Text(title).font(.headline)
                    if let sub = subtitle { Text(sub).font(.subheadline).foregroundStyle(.secondary) }
                }
                Spacer(minLength: 0)
            }

            if case .response(let r) = result, r.holder_name != nil || r.ticket_number != nil {
                VStack(alignment: .leading, spacing: 10) {
                    if let name = r.holder_name, !name.isEmpty {
                        Text(name).font(.title2.weight(.bold)).lineLimit(2).minimumScaleFactor(0.7)
                    }
                    HStack(spacing: 8) {
                        if let n = r.ticket_number {
                            Text(n).font(.body.monospacedDigit().weight(.semibold))
                        }
                        if r.ticket_type_id != nil {
                            TicketBadge(typeId: r.ticket_type_id, name: r.ticket_type_name)
                        }
                        Spacer(minLength: 0)
                    }
                    if r.result == "ok" || r.result == "duplicate" {
                        if let age = AgeGroup(r.age_group) {
                            wristbandRow(age: age, r: r)
                        }
                        if TicketKind(r.ticket_type_id) == .afterparty {
                            infoLine("moon", "Nur Afterparty – Einlass ab 22:30 Uhr")
                        }
                    }
                }
            }

            if case .response(let r) = result, r.result == "invalid", let code = r.code {
                Text(code).font(.footnote.monospaced()).foregroundStyle(.secondary).lineLimit(1).truncationMode(.middle)
            }
            if case .failure(let msg, _) = result {
                Text(msg).font(.subheadline).foregroundStyle(.secondary)
            }

            actionButton
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(uiColor: .secondarySystemBackground), in: .rect(cornerRadius: 28))
        .shadow(color: .black.opacity(0.25), radius: 24, y: 8)
        .overlay(alignment: .top) {
            Capsule().fill(color).frame(width: 44, height: 4).padding(.top, 8).opacity(0.9)
        }
        .accessibilityElement(children: .contain)
    }

    private func wristbandRow(age: AgeGroup, r: CheckinResponse) -> some View {
        let color = r.wristband_color.flatMap(Color.init(hex:)) ?? age.color
        let name = r.wristband_name ?? age.wristband
        return HStack(alignment: .top, spacing: 10) {
            RoundedRectangle(cornerRadius: 4).fill(color).frame(width: 26, height: 14).padding(.top, 3)
            VStack(alignment: .leading, spacing: 2) {
                Text("Bändchen \(name)").font(.body.weight(.semibold))
                Text(age.hint ?? "Alter \(age.short)").font(.subheadline).foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }

    private func infoLine(_ icon: String, _ text: String) -> some View {
        Label(text, systemImage: icon).font(.subheadline).foregroundStyle(.secondary)
    }

    @ViewBuilder private var actionButton: some View {
        if case .failure = result, let onRetry {
            Button(action: onRetry) {
                Label("Erneut versuchen", systemImage: "arrow.clockwise").frame(maxWidth: .infinity)
            }
            .controlSize(.large).tint(color).glassButtonStyle(prominent: true)
        }
    }

    private var status: String {
        if case .response(let r) = result { return r.result }
        return "error"
    }

    private var title: String {
        switch status {
        case "ok": return "Einlass OK"
        case "duplicate": return "Bereits eingelassen"
        case "cancelled": return "Ticket storniert"
        case "invalid": return "Ticket ungültig"
        default: return "Keine Verbindung"
        }
    }

    private var subtitle: String? {
        guard case .response(let r) = result else { return nil }
        switch r.result {
        case "duplicate":
            let when = Fmt.time(r.checked_in_at) ?? "früher"
            return "um \(when)" + (r.checked_in_by_label.map { " von \($0)" } ?? "")
        case "invalid": return "Code unbekannt – nicht einlassen"
        case "cancelled": return "Nicht einlassen"
        default: return nil
        }
    }

    private var icon: String {
        switch status {
        case "ok": return "checkmark"
        case "duplicate": return "exclamationmark"
        case "error": return "wifi.slash"
        default: return "xmark"
        }
    }

    private var color: Color {
        switch status {
        case "ok": return Color(uiColor: .systemGreen)
        case "duplicate": return Color(uiColor: .systemOrange)
        case "error": return Color(uiColor: .systemGray)
        default: return Color(uiColor: .systemRed)
        }
    }
}

enum ScanOutcome: Equatable {
    case response(CheckinResponse)
    /// Netz-/Serverfehler; Code bzw. Ticket-ID zum erneuten Versuch
    case failure(String, retry: CheckinRequest)

    var feedback: Feedback.Kind {
        switch self {
        case .response(let r): return r.result == "ok" ? .ok : r.result == "duplicate" ? .duplicate : .error
        case .failure: return .error
        }
    }
}

enum CheckinRequest: Equatable {
    case code(String)
    case ticket(String)
}
