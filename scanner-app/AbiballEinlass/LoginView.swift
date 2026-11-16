import SwiftUI

struct LoginView: View {
    @Environment(AppModel.self) private var model
    @State private var username = ""
    @State private var password = ""
    @State private var error: String?
    @State private var busy = false
    @FocusState private var focus: Field?
    enum Field { case user, pass }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                SchoolLogo(layout: .stacked, size: 17)
                    .padding(.top, 56)
                    .padding(.bottom, 44)

                VStack(spacing: 8) {
                    Text("Abiball 2027")
                        .font(.system(size: 15, weight: .semibold))
                        .tracking(2)
                        .textCase(.uppercase)
                        .foregroundStyle(.secondary)
                    Text("Einlass")
                        .font(.system(size: 48, weight: .bold))
                }
                .padding(.bottom, 32)

                VStack(spacing: 12) {
                    TextField("Benutzername", text: $username)
                        .textContentType(.username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.next)
                        .focused($focus, equals: .user)
                        .onSubmit { focus = .pass }
                        .modifier(FieldStyle(icon: "person"))
                    SecureField("Passwort", text: $password)
                        .textContentType(.password)
                        .submitLabel(.go)
                        .focused($focus, equals: .pass)
                        .onSubmit(submit)
                        .modifier(FieldStyle(icon: "lock"))
                }

                if let error {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.circle.fill")
                        Text(error)
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color(red: 0.8, green: 0.1, blue: 0.12))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 14).padding(.vertical, 12)
                    .background(RoundedRectangle(cornerRadius: 12).fill(Color.red.opacity(0.08)))
                    .padding(.top, 14)
                    .accessibilityIdentifier("loginError")
                }

                Button(action: submit) {
                    HStack(spacing: 10) {
                        if busy { ProgressView().tint(.white) }
                        Text(busy ? "Anmelden …" : "Anmelden")
                    }
                }
                .buttonStyle(BlackButtonStyle())
                .disabled(busy)
                .padding(.top, 20)

                Text("Nur für das Einlass-Team des Abiballs. Zugangsdaten bekommst du vom Abiball-Team.")
                    .font(.footnote).foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.top, 16)
                HStack(spacing: 16) {
                    Link("Datenschutz", destination: Config.baseURL.appendingPathComponent("datenschutz"))
                    Link("Impressum", destination: Config.baseURL.appendingPathComponent("impressum"))
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.black)
                .padding(.top, 24)
            }
            .padding(.horizontal, 28)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color.white)
    }

    private func submit() {
        let u = username.trimmingCharacters(in: .whitespaces)
        guard !u.isEmpty, !password.isEmpty else { error = "Benutzername und Passwort eingeben."; return }
        busy = true; error = nil; focus = nil
        Task {
            do { try await model.login(username: u, password: password) } catch {
                self.error = error.localizedDescription
            }
            busy = false
        }
    }
}

struct FieldStyle: ViewModifier {
    var icon: String
    func body(content: Content) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).foregroundStyle(.secondary).frame(width: 20)
            content.font(.body)
        }
        .padding(.horizontal, 16).padding(.vertical, 16)
        .background(RoundedRectangle(cornerRadius: 16).fill(Color(white: 0.955)))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.black.opacity(0.06)))
    }
}
