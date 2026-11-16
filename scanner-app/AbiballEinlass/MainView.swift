import SwiftUI

struct MainView: View {
    @Environment(AppModel.self) private var model
    @State private var tab = 0

    var body: some View {
        TabView(selection: $tab) {
            NavigationStack { ScanView(active: tab == 0) }
                .tabItem { Label("Scannen", systemImage: "qrcode.viewfinder") }
                .tag(0)
            NavigationStack { GuestsView() }
                .tabItem { Label("Noch nicht da", systemImage: "person.crop.circle.badge.questionmark") }
                .tag(1)
            NavigationStack { ContactView() }
                .tabItem { Label("Kontakt", systemImage: "person.crop.circle") }
                .tag(2)
        }
        .task {
            // Zahlen regelmäßig aktualisieren, solange angemeldet.
            while !Task.isCancelled {
                await model.refreshStats()
                try? await Task.sleep(for: .seconds(Config.statsInterval))
            }
        }
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
    }
}

/// Menü oben rechts: angemeldeter Name, Ton, Abmelden.
struct AccountMenu: View {
    @Environment(AppModel.self) private var model
    @AppStorage("soundOn") private var soundOn = true
    @State private var confirmLogout = false

    private var initials: String {
        let parts = model.name.split(whereSeparator: { !$0.isLetter }).prefix(2)
        let i = parts.compactMap { $0.first }.map { String($0).uppercased() }.joined()
        return i.isEmpty ? "?" : i
    }

    var body: some View {
        Menu {
            Section("Angemeldet als \(model.name) · Version \(Config.version)") {
                Toggle(isOn: $soundOn) { Label("Ton bei Scan", systemImage: "speaker.wave.2") }
                Link(destination: Config.baseURL.appendingPathComponent("datenschutz")) {
                    Label("Datenschutz", systemImage: "hand.raised")
                }
                Link(destination: Config.baseURL.appendingPathComponent("impressum")) {
                    Label("Impressum", systemImage: "info.circle")
                }
                Button(role: .destructive) { confirmLogout = true } label: {
                    Label("Abmelden", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
        } label: {
            Text(initials)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 40, height: 40)
                .background(Circle().fill(Color.black))
                .accessibilityLabel("Konto: \(model.name)")
        }
        .confirmationDialog("Wirklich abmelden?", isPresented: $confirmLogout, titleVisibility: .visible) {
            Button("Abmelden", role: .destructive) { model.logout() }
        }
    }
}
