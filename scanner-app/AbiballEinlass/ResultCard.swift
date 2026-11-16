import SwiftUI

/// Großes, farbiges Scan-Ergebnis.
struct ResultCard: View {
    let result: ScanOutcome
    var onDismiss: (() -> Void)? = nil
    var onRetry: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: icon).font(.system(size: 30, weight: .bold))
                Text(title).font(.system(size: 30, weight: .heavy)).minimumScaleFactor(0.6).lineLimit(1)
            }
            switch result {
            case .response(let r):
                if let name = r.holder_name, !name.isEmpty {
                    Text(name).font(.system(size: 28, weight: .bold)).lineLimit(2).minimumScaleFactor(0.6)
                }
                if r.ticket_number != nil || r.ticket_type_id != nil {
                    HStack(spacing: 10) {
                        if let n = r.ticket_number {
                            Text(n).font(.system(size: 26, weight: .heavy).monospacedDigit())
                        }
                        if r.ticket_type_id != nil {
                            TicketBadge(typeId: r.ticket_type_id, name: r.ticket_type_name, onColor: true, large: true)
                        }
                    }
                }
                if r.result == "ok" || r.result == "duplicate", let age = AgeGroup(r.age_group) {
                    AgeBandBadge(id: r.age_group, large: true)
                    if let hint = age.hint {
                        Text(hint).font(.headline.weight(.bold))
                    }
                }
                if r.result == "duplicate" {
                    let when = Fmt.time(r.checked_in_at) ?? "früher"
                    let who = r.checked_in_by_label.map { " von \($0)" } ?? ""
                    Text("Eingelassen um \(when)\(who)").font(.headline)
                }
                if TicketKind(r.ticket_type_id) == .afterparty, r.result == "ok" || r.result == "duplicate" {
                    Text("Nur Afterparty – Einlass ab 22:30 Uhr")
                        .font(.headline.weight(.bold))
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(RoundedRectangle(cornerRadius: 10).fill(Color.black.opacity(0.35)))
                }
                if r.result == "invalid", let code = r.code {
                    Text(code).font(.footnote.monospaced()).lineLimit(1).truncationMode(.middle).opacity(0.85)
                }
            case .failure(let msg, _):
                Text(msg).font(.headline)
            }
            actionButton
                .padding(.top, 4)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(RoundedRectangle(cornerRadius: 22).fill(color))
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder private var actionButton: some View {
        if case .failure = result, let onRetry {
            Button(action: onRetry) {
                Label("Erneut versuchen", systemImage: "arrow.clockwise")
            }
            .buttonStyle(CardButtonStyle())
        } else if let onDismiss {
            Button(action: onDismiss) {
                Text(status == "ok" ? "Weiter scannen" : "Verstanden")
            }
            .buttonStyle(CardButtonStyle())
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
        case "cancelled": return "Storniert"
        case "invalid": return "Ungültig / unbekannt"
        default: return "Fehler"
        }
    }

    private var icon: String {
        switch status {
        case "ok": return "checkmark.circle.fill"
        case "duplicate": return "exclamationmark.circle.fill"
        case "error": return "wifi.exclamationmark"
        default: return "xmark.octagon.fill"
        }
    }

    private var color: Color {
        switch status {
        case "ok": return Color(red: 0.08, green: 0.62, blue: 0.27)
        case "duplicate": return Color(red: 0.93, green: 0.49, blue: 0.0)
        case "error": return Color(white: 0.3)
        default: return Color(red: 0.84, green: 0.11, blue: 0.13)
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

/// Weißer runder Button auf der farbigen Ergebniskarte.
struct CardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 13)
            .foregroundStyle(.black)
            .background(Capsule().fill(.white))
            .opacity(configuration.isPressed ? 0.75 : 1)
    }
}
