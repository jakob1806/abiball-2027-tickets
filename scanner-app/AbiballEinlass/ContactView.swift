import SwiftUI

/// Kontaktkarte im Stil der aktuellen iOS-Kontakte-App (blauer Verlauf, Glas-Elemente).
struct ContactView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.dismiss) private var dismiss
    var showsDone = false

    private typealias C = Config.Contact
    private var initials: String { C.name.split(separator: " ").compactMap(\.first).map(String.init).joined() }
    private var whatsapp: String { "https://wa.me/\(C.phone.filter(\.isNumber))" }

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.24, green: 0.47, blue: 0.84), Color(red: 0.10, green: 0.17, blue: 0.50)],
                           startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // Glas-Kreis mit Initialen
                    ZStack {
                        Circle().fill(.white.opacity(0.08))
                        Circle().strokeBorder(
                            LinearGradient(colors: [.white.opacity(0.55), .white.opacity(0.05), .white.opacity(0.35)],
                                           startPoint: .top, endPoint: .bottom),
                            lineWidth: 1.5)
                        Text(initials)
                            .font(.system(size: 92, weight: .regular, design: .rounded))
                            .foregroundStyle(.white.opacity(0.92))
                    }
                    .frame(width: 200, height: 200)
                    .shadow(color: .black.opacity(0.15), radius: 20, y: 8)
                    .padding(.top, 24)

                    Text(C.name)
                        .font(.system(size: 26, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(.top, 22)

                    // Runde Aktionsknöpfe
                    HStack(spacing: 10) {
                        circleButton("message.fill", label: "SMS") { open("sms:\(C.phone)") }
                        circleButton("phone.fill", label: "Anrufen") { open("tel:\(C.phone)") }
                        circleButton("bubble.left.and.text.bubble.right.fill", label: "WhatsApp") { open(whatsapp) }
                    }
                    .padding(.top, 18)

                    // Telefon
                    card {
                        infoRow(label: "Mobil", value: C.phoneDisplay, icon: "phone.fill") { open("tel:\(C.phone)") }
                    }
                    .padding(.top, 24)

                    // Nachrichten
                    card {
                        infoRow(label: "SMS", value: "Nachricht senden", icon: "message.fill") { open("sms:\(C.phone)") }
                        divider
                        infoRow(label: "WhatsApp", value: "Chat öffnen", icon: "bubble.left.and.text.bubble.right.fill") { open(whatsapp) }
                    }
                    .padding(.top, 12)

                    card {
                        Button { UIPasteboard.general.string = C.phoneDisplay } label: {
                            Text("Nummer kopieren")
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 18).padding(.vertical, 15)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(.white)
                    }
                    .padding(.top, 12)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 28)
            }
        }
        .toolbar {
            if showsDone {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Fertig") { dismiss() }.foregroundStyle(.white)
                }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .navigationBarTitleDisplayMode(.inline)
        .preferredColorScheme(.dark)
    }

    private func circleButton(_ icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(.white)
                .frame(width: 64, height: 64)
                .background(Circle().fill(.white.opacity(0.12)))
                .overlay(Circle().strokeBorder(.white.opacity(0.22), lineWidth: 1))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(label): \(C.name)")
    }

    private func card<Content: View>(@ViewBuilder _ content: () -> Content) -> some View {
        VStack(spacing: 0, content: content)
            .background(RoundedRectangle(cornerRadius: 24).fill(.white.opacity(0.10)))
            .overlay(RoundedRectangle(cornerRadius: 24).strokeBorder(.white.opacity(0.10), lineWidth: 1))
    }

    private var divider: some View {
        Rectangle().fill(.white.opacity(0.15)).frame(height: 1).padding(.horizontal, 18)
    }

    private func infoRow(label: String, value: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(label).font(.subheadline).foregroundStyle(.white.opacity(0.7))
                    Text(value).font(.title3).foregroundStyle(.white)
                }
                Spacer()
                Image(systemName: icon).font(.system(size: 16)).foregroundStyle(.white.opacity(0.85))
            }
            .padding(.horizontal, 18).padding(.vertical, 13)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func open(_ s: String) {
        if let u = URL(string: s) { openURL(u) }
    }
}

extension Color {
    /// Systemblau (App-Akzent ist sonst schwarz).
    static let accentBlue = Color(uiColor: .systemBlue)
}
