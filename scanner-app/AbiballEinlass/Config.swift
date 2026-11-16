import Foundation

enum Config {
    /// Basis-URL des Ticketportals. Für die eigene Domain nur hier ändern.
    static let baseURL = URL(string: "https://abiball-2027-tickets.vercel.app")!

    /// Gleicher Code wird innerhalb dieser Zeit nicht erneut gesendet.
    static let debounceSeconds: TimeInterval = 4
    /// Abstand der automatischen Aktualisierung der Zahlen.
    static let statsInterval: TimeInterval = 15
}
