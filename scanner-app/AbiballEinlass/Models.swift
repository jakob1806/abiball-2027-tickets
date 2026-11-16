import Foundation

struct LoginResponse: Decodable {
    struct User: Decodable { let name: String; let username: String }
    let token: String
    let user: User
}

struct MeResponse: Decodable { let name: String }

struct CheckinResponse: Decodable, Equatable {
    let result: String
    let holder_name: String?
    let ticket_number: String?
    let ticket_type_id: String?
    let ticket_type_name: String?
    let checked_in_at: String?
    let checked_in_by_label: String?
    var code: String?
    /// Altersgruppe (u16, u18, a18) für die Bändchenfarbe; fehlt bei älteren Server-Versionen.
    var age_group: String? = nil
}

struct Stats: Decodable, Equatable {
    struct PerType: Decodable, Equatable, Identifiable {
        let id: String
        let name: String
        let prefix: String?
        let sold: Int
        let inside: Int
    }
    let capacity: Int
    let sold: Int
    let inside: Int
    let missing: Int
    let perType: [PerType]
    let updatedAt: String?
}

struct Guest: Decodable, Identifiable, Equatable {
    let id: String
    let ticket_number: String?
    let holder_name: String
    let ticket_type_id: String
    let checked_in_at: String?
    let checked_in_by_label: String?
    /// Altersgruppe (u16, u18, a18) für die Bändchenfarbe; fehlt bei älteren Server-Versionen.
    var age_group: String? = nil
}

struct GuestsResponse: Decodable {
    let count: Int
    let guests: [Guest]
}

enum TicketKind {
    case ball, afterparty, other
    init(_ id: String?) {
        switch id {
        case "ball": self = .ball
        case "afterparty": self = .afterparty
        default: self = .other
        }
    }
}

enum Fmt {
    private static let time: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "de_DE")
        f.timeZone = TimeZone(identifier: "Europe/Berlin")
        f.dateFormat = "HH:mm"
        return f
    }()

    /// Postgres liefert z. B. 2027-06-26T19:02:11.123456+00:00 – Nachkommastellen abschneiden.
    static func date(_ s: String?) -> Date? {
        guard var s else { return nil }
        if let dot = s.firstIndex(of: "."), let end = s[dot...].firstIndex(where: { $0 == "+" || $0 == "Z" || $0 == "-" }) {
            s.removeSubrange(dot..<end)
        }
        let f = ISO8601DateFormatter()
        return f.date(from: s)
    }

    static func time(_ s: String?) -> String? {
        guard let d = date(s) else { return nil }
        return time.string(from: d) + " Uhr"
    }
}
