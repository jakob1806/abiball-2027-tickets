import SwiftUI

/// Kontaktkarte mit den Apple-Bausteinen der Kontakte-App:
/// iOS 26 Liquid Glass (glassEffect, GlassEffectContainer, .glass-Buttons), davor System-Material.
struct ContactView: View {
    @Environment(\.openURL) private var openURL
    @Environment(\.dismiss) private var dismiss
    var showsDone = false

    private typealias C = Config.Contact
    private var initials: String { C.name.split(separator: " ").compactMap(\.first).map(String.init).joined() }
    private var whatsapp: String { "https://wa.me/\(C.phone.filter(\.isNumber))" }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                Text(initials)
                    .font(.system(size: 88, weight: .regular, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(width: 200, height: 200)
                    .glassCircle()
                    .padding(.top, 24)
                    .accessibilityHidden(true)

                Text(C.name)
                    .font(.title.bold())
                    .foregroundStyle(.white)
                    .padding(.top, 20)

                GlassGroup {
                    HStack(spacing: 12) {
                        actionButton("message.fill", "SMS") { open("sms:\(C.phone)") }
                        actionButton("phone.fill", "Anrufen") { open("tel:\(C.phone)") }
                        actionButton("bubble.left.and.text.bubble.right.fill", "WhatsApp") { open(whatsapp) }
                    }
                }
                .padding(.top, 18)

                VStack(spacing: 12) {
                    GlassCard {
                        row("Mobil", C.phoneDisplay, icon: "phone.fill") { open("tel:\(C.phone)") }
                    }
                    GlassCard {
                        row("SMS", "Nachricht senden", icon: "message.fill") { open("sms:\(C.phone)") }
                        Divider().overlay(.white.opacity(0.2)).padding(.leading, 18)
                        row("WhatsApp", "Chat öffnen", icon: "bubble.left.and.text.bubble.right.fill") { open(whatsapp) }
                    }
                    GlassCard {
                        Button { UIPasteboard.general.string = C.phoneDisplay } label: {
                            Label("Nummer kopieren", systemImage: "doc.on.doc")
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 18).padding(.vertical, 15)
                                .contentShape(.rect)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .foregroundStyle(.white)
                .padding(.top, 24)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 28)
        }
        .background {
            LinearGradient(colors: [Color(red: 0.24, green: 0.47, blue: 0.84), Color(red: 0.10, green: 0.17, blue: 0.50)],
                           startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()
        }
        .toolbar {
            if showsDone {
                ToolbarItem(placement: .topBarTrailing) { Button("Fertig") { dismiss() } }
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .environment(\.colorScheme, .dark)
        .navigationBarTitleDisplayMode(.inline)
    }

    @ViewBuilder
    private func actionButton(_ icon: String, _ label: String, action: @escaping () -> Void) -> some View {
        let button = Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 22, weight: .medium))
                .frame(width: 44, height: 44)
        }
        .buttonBorderShape(.circle)
        .controlSize(.large)
        .tint(.white)
        .accessibilityLabel("\(label): \(C.name)")

        if #available(iOS 26.0, *) {
            button.buttonStyle(.glass)
        } else {
            button.buttonStyle(.bordered)
        }
    }

    private func row(_ label: String, _ value: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label).font(.subheadline).foregroundStyle(.secondary)
                    Text(value).font(.title3)
                }
                Spacer()
                Image(systemName: icon).foregroundStyle(.secondary)
            }
            .padding(.horizontal, 18).padding(.vertical, 12)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }

    private func open(_ s: String) {
        if let u = URL(string: s) { openURL(u) }
    }
}

/// Liquid-Glass-Karte (iOS 26), sonst System-Material.
private struct GlassCard<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        let stack = VStack(spacing: 0) { content }
        if #available(iOS 26.0, *) {
            stack.glassEffect(.regular, in: .rect(cornerRadius: 26))
        } else {
            stack.background(.ultraThinMaterial, in: .rect(cornerRadius: 26))
        }
    }
}

/// Gruppiert Glas-Elemente, damit sie wie in Apples Apps zusammen verschmelzen.
private struct GlassGroup<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: 12) { content }
        } else {
            content
        }
    }
}

private extension View {
    @ViewBuilder func glassCircle() -> some View {
        if #available(iOS 26.0, *) {
            glassEffect(.regular, in: .circle)
        } else {
            background(.ultraThinMaterial, in: .circle)
        }
    }
}

extension Color {
    /// Systemblau (App-Akzent ist sonst schwarz).
    static let accentBlue = Color(uiColor: .systemBlue)
}
