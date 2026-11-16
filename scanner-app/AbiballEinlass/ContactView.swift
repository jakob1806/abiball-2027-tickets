import SwiftUI

/// Kontaktkarte im Stil der iOS-Kontakte-App.
struct ContactView: View {
    @Environment(\.openURL) private var openURL
    var showsDone = false
    @Environment(\.dismiss) private var dismiss

    private typealias C = Config.Contact

    private var initials: String {
        C.name.split(separator: " ").compactMap(\.first).map(String.init).joined()
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Bild + Name
                ZStack {
                    Circle().fill(LinearGradient(colors: [Color(white: 0.66), Color(white: 0.52)], startPoint: .top, endPoint: .bottom))
                    Text(initials)
                        .font(.system(size: 46, weight: .medium, design: .rounded))
                        .foregroundStyle(.white)
                }
                .frame(width: 112, height: 112)
                .padding(.top, 12)

                Text(C.name)
                    .font(.system(size: 30, weight: .regular))
                    .padding(.top, 14)
                Text(C.role)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.top, 2)
                Text("Wenn am Einlass etwas nicht klappt, melde dich.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.top, 8)

                // Aktions-Kacheln
                HStack(spacing: 8) {
                    action("Anrufen", icon: "phone.fill", url: "tel:\(C.phone)")
                    action("SMS", icon: "message.fill", url: "sms:\(C.phone)")
                    action("WhatsApp", icon: "bubble.left.and.text.bubble.right.fill",
                           url: "https://wa.me/\(C.phone.filter(\.isNumber))")
                }
                .padding(.top, 22)

                // Nummer
                VStack(alignment: .leading, spacing: 0) {
                    Button { open("tel:\(C.phone)") } label: {
                        VStack(alignment: .leading, spacing: 3) {
                            Text("mobil").font(.subheadline).foregroundStyle(.primary)
                            Text(C.phoneDisplay).font(.body).foregroundStyle(Color.accentBlue)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 16).padding(.vertical, 11)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        Button { UIPasteboard.general.string = C.phoneDisplay } label: {
                            Label("Nummer kopieren", systemImage: "doc.on.doc")
                        }
                    }
                }
                .background(RoundedRectangle(cornerRadius: 12).fill(Color(.secondarySystemGroupedBackground)))
                .padding(.top, 16)

                // Weitere Zeilen wie in Kontakte
                VStack(spacing: 0) {
                    row("Nachricht senden") { open("sms:\(C.phone)") }
                    Divider().padding(.leading, 16)
                    row("Per WhatsApp schreiben") { open("https://wa.me/\(C.phone.filter(\.isNumber))") }
                    Divider().padding(.leading, 16)
                    row("Nummer kopieren") { UIPasteboard.general.string = C.phoneDisplay }
                }
                .background(RoundedRectangle(cornerRadius: 12).fill(Color(.secondarySystemGroupedBackground)))
                .padding(.top, 16)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .background(Color(.systemGroupedBackground))
        .toolbar {
            if showsDone {
                ToolbarItem(placement: .topBarTrailing) { Button("Fertig") { dismiss() } }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func action(_ title: String, icon: String, url: String) -> some View {
        Button { open(url) } label: {
            VStack(spacing: 5) {
                Image(systemName: icon).font(.system(size: 19, weight: .medium)).frame(height: 24)
                Text(title).font(.system(size: 12))
            }
            .foregroundStyle(Color.accentBlue)
            .frame(maxWidth: .infinity)
            .frame(height: 58)
            .background(RoundedRectangle(cornerRadius: 12).fill(Color(.secondarySystemGroupedBackground)))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(title): \(Config.Contact.name)")
    }

    private func row(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .foregroundStyle(Color.accentBlue)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16).padding(.vertical, 12)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private func open(_ s: String) {
        if let u = URL(string: s) { openURL(u) }
    }
}

extension Color {
    /// Systemblau wie in Telefon/Kontakte (App-Akzent ist sonst schwarz).
    static let accentBlue = Color(uiColor: .systemBlue)
}
