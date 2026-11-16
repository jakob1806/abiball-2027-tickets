import Foundation

enum Config {
    /// Basis-URL des Ticketportals. Für die eigene Domain nur hier ändern.
    static let baseURL = URL(string: "https://abiball-2027-tickets.vercel.app")!

    /// Gleicher Code wird innerhalb dieser Zeit nicht erneut gesendet.
    static let debounceSeconds: TimeInterval = 4
    /// Abstand der automatischen Aktualisierung der Zahlen.
    static let statsInterval: TimeInterval = 15

    static var version: String {
        let i = Bundle.main.infoDictionary
        return "\(i?["CFBundleShortVersionString"] as? String ?? "?") (\(i?["CFBundleVersion"] as? String ?? "?"))"
    }

    /// Ansprechpartner bei Problemen (Tab „Kontakt“).
    enum Contact {
        static let name = "Jakob Liess"
        static let role = "Abiball-Team · Tickets & Einlass-App"
        /// Internationales Format ohne Leerzeichen
        static let phone = "+4915737260486"
        static let phoneDisplay = "+49 1573 7260486"
    }
}
