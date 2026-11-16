import Foundation

enum APIError: LocalizedError {
    case unauthorized
    case server(String)
    case network

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Abgemeldet – bitte neu anmelden."
        case .server(let m): return m
        case .network: return "Keine Verbindung zum Server."
        }
    }
}

struct API {
    var token: String?

    private static let session: URLSession = {
        let c = URLSessionConfiguration.default
        c.timeoutIntervalForRequest = 12
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        c.waitsForConnectivity = false
        return URLSession(configuration: c)
    }()

    private func request<T: Decodable>(_ method: String, _ path: String, query: [URLQueryItem] = [], body: [String: String]? = nil) async throws -> T {
        var comps = URLComponents(url: Config.baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comps.queryItems = query }
        var req = URLRequest(url: comps.url!)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        let data: Data, resp: URLResponse
        do { (data, resp) = try await Self.session.data(for: req) } catch { throw APIError.network }
        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if status == 401 {
            // Beim Login bedeutet 401 „falsches Passwort“, sonst „abgemeldet“.
            if path == "/api/scanner/login" { throw APIError.server(Self.message(data) ?? "Benutzername oder Passwort falsch") }
            throw APIError.unauthorized
        }
        guard (200..<300).contains(status) else {
            throw APIError.server(Self.message(data) ?? "Serverfehler (\(status))")
        }
        do { return try JSONDecoder().decode(T.self, from: data) } catch { throw APIError.server("Unerwartete Antwort vom Server") }
    }

    private static func message(_ data: Data) -> String? {
        (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
    }

    func login(username: String, password: String) async throws -> LoginResponse {
        #if DEBUG
        if Demo.on { return Demo.login() }
        #endif
        return try await request("POST", "/api/scanner/login", body: ["username": username, "password": password])
    }

    func me() async throws -> MeResponse {
        #if DEBUG
        if Demo.on { return MeResponse(name: "Demo-Einlass") }
        #endif
        return try await request("GET", "/api/scanner/me")
    }

    func checkin(code: String) async throws -> CheckinResponse {
        #if DEBUG
        if Demo.on { try? await Task.sleep(for: .milliseconds(250)); return Demo.checkin(code) }
        #endif
        var r: CheckinResponse = try await request("POST", "/api/scanner/checkin", body: ["code": code])
        r.code = code
        return r
    }

    func checkin(ticketId: String) async throws -> CheckinResponse {
        #if DEBUG
        if Demo.on { return Demo.checkin(ticketId == "2" || ticketId == "5" ? "AP" : "OK") }
        #endif
        return try await request("POST", "/api/scanner/checkin", body: ["ticketId": ticketId])
    }

    func stats() async throws -> Stats {
        #if DEBUG
        if Demo.on { return Demo.stats() }
        #endif
        return try await request("GET", "/api/scanner/stats")
    }

    func guests(status: String, q: String) async throws -> GuestsResponse {
        #if DEBUG
        if Demo.on { return Demo.guests(status: status, q: q) }
        #endif
        return try await request("GET", "/api/scanner/guests", query: [.init(name: "status", value: status), .init(name: "q", value: q)])
    }
}
