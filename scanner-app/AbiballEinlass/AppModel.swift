import Foundation
import Observation

@MainActor
@Observable
final class AppModel {
    enum Phase { case starting, loggedOut, loggedIn }

    var phase: Phase = .starting
    var name: String = UserDefaults.standard.string(forKey: "scannerName") ?? ""
    var stats: Stats?
    var statsError = false

    private(set) var token: String? = Keychain.load()
    var api: API { API(token: token) }

    func start() async {
        guard token != nil else { phase = .loggedOut; return }
        do {
            let me = try await api.me()
            setName(me.name)
            phase = .loggedIn
        } catch APIError.unauthorized {
            logout()
        } catch {
            // Offline beim Start: angemeldet bleiben, Anfragen zeigen den Fehler.
            phase = .loggedIn
        }
    }

    func login(username: String, password: String) async throws {
        let r = try await API(token: nil).login(username: username, password: password)
        Keychain.save(r.token)
        token = r.token
        setName(r.user.name)
        phase = .loggedIn
    }

    func logout() {
        Keychain.delete()
        token = nil
        stats = nil
        setName("")
        phase = .loggedOut
    }

    /// Führt eine API-Anfrage aus; bei 401 geht es zurück zum Login.
    func call<T>(_ op: (API) async throws -> T) async throws -> T {
        do { return try await op(api) } catch APIError.unauthorized {
            logout()
            throw APIError.unauthorized
        }
    }

    func refreshStats() async {
        guard phase == .loggedIn else { return }
        do {
            stats = try await call { try await $0.stats() }
            statsError = false
        } catch {
            statsError = true
        }
    }

    private func setName(_ n: String) {
        name = n
        UserDefaults.standard.set(n, forKey: "scannerName")
    }
}
