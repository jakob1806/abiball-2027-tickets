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
        let fg: Color = isAP ? .white : (onColor ? .black : .white)
        let bg: Color = isAP ? Color(white: onColor ? 0.22 : 0.25) : (onColor ? .white : .black)
        Text(label).font(.system(size: fs, weight: .bold))
        .foregroundStyle(fg)
        .padding(.horizontal, large ? 12 : 8).padding(.vertical, large ? 6 : 4)
        .background(Capsule().fill(bg))
        .overlay(Capsule().stroke(Color.white.opacity(isAP && onColor ? 0.35 : 0), lineWidth: 1))
    }
}
