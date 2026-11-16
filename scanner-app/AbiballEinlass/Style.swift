import SwiftUI

/// Schwarzer, runder Button wie auf der Website.
struct BlackButtonStyle: ButtonStyle {
    var inverted = false
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .foregroundStyle(inverted ? Color.black : Color.white)
            .background(Capsule().fill(inverted ? Color.white : Color.black))
            .overlay(Capsule().stroke(Color.black, lineWidth: inverted ? 1.5 : 0))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

/// Kennzeichnung der Ticketart: Ball hell gefüllt, Afterparty dunkel.
struct TicketBadge: View {
    let typeId: String?
    let name: String?
    /// true = auf dunklem/farbigem Hintergrund
    var onColor = false
    var large = false

    var body: some View {
        let kind = TicketKind(typeId)
        let label = name ?? (kind == .afterparty ? "Afterparty" : kind == .ball ? "Ball" : "Ticket")
        let fs: CGFloat = large ? 18 : 12
        let isAP = kind == .afterparty
        let fg: Color = isAP ? .white : (onColor ? .black : Color(uiColor: .systemBackground))
        let bg: Color = isAP ? Color(white: onColor ? 0.22 : 0.38) : (onColor ? .white : .primary)
        Text(label).font(.system(size: fs, weight: .bold))
        .foregroundStyle(fg)
        .padding(.horizontal, large ? 12 : 8).padding(.vertical, large ? 6 : 4)
        .background(Capsule().fill(bg))
        .overlay(Capsule().stroke(Color.white.opacity(isAP && onColor ? 0.35 : 0), lineWidth: 1))
    }
}

/// Altersgruppe am Tag des Abiballs mit Bändchenfarbe.
/// Muss zu `AGE_GROUPS` in `src/lib/event.ts` passen (Web, Admin, Excel).
enum AgeGroup: String {
    case u16, u18, a18

    init?(_ id: String?) {
        guard let id, let g = AgeGroup(rawValue: id) else { return nil }
        self = g
    }

    var short: String {
        switch self {
        case .u16: return "unter 16"
        case .u18: return "16–17"
        case .a18: return "18+"
        }
    }

    var wristband: String {
        switch self {
        case .u16: return "Rot"
        case .u18: return "Gelb"
        case .a18: return "Grün"
        }
    }

    var color: Color {
        switch self {
        case .u16: return Color(red: 0.77, green: 0.0, blue: 0.0)
        case .u18: return Color(red: 0.85, green: 0.64, blue: 0.0)
        case .a18: return Color(red: 0.04, green: 0.49, blue: 0.2)
        }
    }

    /// Kurzer Hinweis für das Einlass-Team (nil bei Volljährigen).
    var hint: String? {
        switch self {
        case .u16: return "Ausweis prüfen – nur mit Begleitperson"
        case .u18: return "Ausweis prüfen – ab 24 Uhr nur mit Erziehungsbeauftragung"
        case .a18: return nil
        }
    }
}

/// Bändchen-Anzeige: farbiger Punkt, Altersgruppe und Farbe, z. B. „● 16–17 · Gelb“.
/// Zeigt nichts, solange der Server keine Altersgruppe liefert (ältere Server-Version oder Altbestand).
struct AgeBandBadge: View {
    let id: String?
    /// Vom Server (Admin-Einstellungen); sonst Standardfarbe
    var name: String? = nil
    var colorHex: String? = nil
    var large = false

    var body: some View {
        if let g = AgeGroup(id) {
            let band = name ?? g.wristband
            let color = colorHex.flatMap(Color.init(hex:)) ?? g.color
            let fs: CGFloat = large ? 20 : 12
            HStack(spacing: large ? 8 : 5) {
                Circle().fill(color).frame(width: large ? 16 : 9, height: large ? 16 : 9)
                Text(large ? "Bändchen \(band) · \(g.short)" : "\(g.short) · \(band)").font(.system(size: fs, weight: .bold))
            }
            .foregroundStyle(.black)
            .padding(.horizontal, large ? 14 : 8).padding(.vertical, large ? 7 : 3)
            .background(Capsule().fill(.white))
            .overlay(Capsule().stroke(color, lineWidth: large ? 3 : 1.5))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Bändchen \(band), Alter \(g.short)")
        }
    }
}

extension Color {
    /// Farbe aus „#rrggbb“ (vom Server).
    init?(hex: String) {
        var h = hex.trimmingCharacters(in: .whitespaces)
        if h.hasPrefix("#") { h.removeFirst() }
        guard h.count == 6, let v = UInt32(h, radix: 16) else { return nil }
        self.init(red: Double((v >> 16) & 0xff) / 255, green: Double((v >> 8) & 0xff) / 255, blue: Double(v & 0xff) / 255)
    }
}

// MARK: - Liquid Glass (iOS 26) mit Material-Fallback

extension View {
    /// Glasfläche in Apple-Optik (iOS 26 Liquid Glass, sonst ultraThinMaterial).
    @ViewBuilder func glassPanel(cornerRadius: CGFloat = 24, tint: Color? = nil) -> some View {
        if #available(iOS 26.0, *) {
            glassEffect(tint.map { .regular.tint($0) } ?? .regular, in: .rect(cornerRadius: cornerRadius))
        } else {
            background(.ultraThinMaterial, in: .rect(cornerRadius: cornerRadius))
        }
    }

    @ViewBuilder func glassCapsule() -> some View {
        if #available(iOS 26.0, *) {
            glassEffect(.regular, in: .capsule)
        } else {
            background(.ultraThinMaterial, in: .capsule)
        }
    }

    @ViewBuilder func glassButtonStyle(prominent: Bool = false) -> some View {
        if #available(iOS 26.0, *) {
            if prominent { buttonStyle(.glassProminent) } else { buttonStyle(.glass) }
        } else {
            if prominent { buttonStyle(.borderedProminent) } else { buttonStyle(.bordered) }
        }
    }
}
