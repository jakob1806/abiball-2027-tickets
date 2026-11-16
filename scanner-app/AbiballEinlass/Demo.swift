#if DEBUG
import Foundation

/// Nur Debug-Builds: Startargument `-demo` liefert Beispieldaten statt Server-Anfragen (für Simulator-Tests).
enum Demo {
    static let on = ProcessInfo.processInfo.arguments.contains("-demo")
    private static var inside = 212

    static func login() -> LoginResponse { .init(token: "demo", user: .init(name: "Demo-Einlass", username: "demo")) }

    static func checkin(_ code: String) -> CheckinResponse {
        let c = code.uppercased()
        if c.contains("X") {
            return .init(result: "invalid", holder_name: nil, ticket_number: nil, ticket_type_id: nil, ticket_type_name: nil, checked_in_at: nil, checked_in_by_label: nil, code: code)
        }
        if c.contains("STORNO") {
            return .init(result: "cancelled", holder_name: "Max Mustermann", ticket_number: "B-118", ticket_type_id: "ball", ticket_type_name: "Ball", checked_in_at: nil, checked_in_by_label: nil, code: code)
        }
        if c.contains("DUP") {
            return .init(result: "duplicate", holder_name: "Anna Beispiel", ticket_number: "B-042", ticket_type_id: "ball", ticket_type_name: "Ball", checked_in_at: "2027-06-26T17:41:09.123456+00:00", checked_in_by_label: "Lena (Eingang 1)", code: code, age_group: "a18")
        }
        inside += 1
        if c.contains("AP") {
            return .init(result: "ok", holder_name: "Jonas Afterparty", ticket_number: "A-007", ticket_type_id: "afterparty", ticket_type_name: "Afterparty", checked_in_at: nil, checked_in_by_label: nil, code: code, age_group: "u18", wristband_name: "Blau", wristband_color: "#1d4ed8")
        }
        return .init(result: "ok", holder_name: "Sophie Musterfrau", ticket_number: "B-203", ticket_type_id: "ball", ticket_type_name: "Ball", checked_in_at: nil, checked_in_by_label: nil, code: code, age_group: c.contains("U16") ? "u16" : "a18")
    }

    static func stats() -> Stats {
        .init(capacity: 350, sold: 318, inside: inside, missing: 318 - inside, perType: [
            .init(id: "ball", name: "Ball", prefix: "B", sold: 268, inside: inside - 21),
            .init(id: "afterparty", name: "Afterparty", prefix: "A", sold: 50, inside: 21),
        ], updatedAt: nil)
    }

    static func guests(status: String, q: String) -> GuestsResponse {
        let all: [Guest] = [
            .init(id: "1", ticket_number: "B-001", holder_name: "Alexander Adler", ticket_type_id: "ball", checked_in_at: nil, checked_in_by_label: nil, age_group: "a18"),
            .init(id: "2", ticket_number: "A-014", holder_name: "Berta Brandl", ticket_type_id: "afterparty", checked_in_at: nil, checked_in_by_label: nil, age_group: "u18"),
            .init(id: "3", ticket_number: "B-077", holder_name: "Clara Christ", ticket_type_id: "ball", checked_in_at: "2027-06-26T17:12:00+00:00", checked_in_by_label: "Lena (Eingang 1)", age_group: "a18"),
            .init(id: "4", ticket_number: "B-145", holder_name: "David Dorn", ticket_type_id: "ball", checked_in_at: nil, checked_in_by_label: nil, age_group: "u16"),
            .init(id: "5", ticket_number: "A-031", holder_name: "Emilia Engel", ticket_type_id: "afterparty", checked_in_at: nil, checked_in_by_label: nil, age_group: "a18"),
        ]
        let f = all.filter {
            (status == "all" || (status == "in") == ($0.checked_in_at != nil))
                && (q.isEmpty || $0.holder_name.localizedCaseInsensitiveContains(q) || ($0.ticket_number ?? "").localizedCaseInsensitiveContains(q))
        }
        return .init(count: f.count, guests: f)
    }
}
#endif
