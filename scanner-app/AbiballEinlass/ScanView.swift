import AVFoundation
import SwiftUI

struct ScanView: View {
    let active: Bool
    @Environment(AppModel.self) private var model
    @Environment(\.scenePhase) private var scenePhase
    @State private var torch = false
    @State private var outcome: ScanOutcome?
    @State private var busy = false
    @State private var lastCode: String?
    @State private var lastTime = Date.distantPast
    @State private var manualOpen = false
    @State private var manualCode = ""
    @State private var cameraStatus = AVCaptureDevice.authorizationStatus(for: .video)
    @State private var resultID = 0

    var body: some View {
        ZStack {
            camera.ignoresSafeArea()

            VStack(spacing: 12) {
                // Oben: Zahlen und Konto
                HStack(alignment: .top, spacing: 10) {
                    StatsPill()
                    Spacer(minLength: 0)
                    AccountMenu()
                }

                Spacer(minLength: 0)

                if busy {
                    ProgressView().controlSize(.large).tint(.white)
                        .padding(18).glassPanel(cornerRadius: 20)
                }

                Spacer(minLength: 0)

                // Unten: Ergebnis oder Hinweis + Bedienelemente
                if let outcome {
                    ResultCard(
                        result: outcome,
                        onDismiss: { withAnimation(.snappy) { self.outcome = nil } },
                        onRetry: { if case .failure(_, let retry) = outcome { send(retry) } }
                    )
                    .id(resultID)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                } else {
                    Text(hintText)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16).padding(.vertical, 10)
                        .glassCapsule()
                }
                controls
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
        .toolbar(.hidden, for: .navigationBar)
        .alert("Code eingeben", isPresented: $manualOpen) {
            TextField("WG27-XXXX-XXXX-XXXX", text: $manualCode)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
            Button("Prüfen") {
                let c = manualCode.trimmingCharacters(in: .whitespacesAndNewlines)
                manualCode = ""
                if !c.isEmpty { send(.code(c)) }
            }
            Button("Abbrechen", role: .cancel) { manualCode = "" }
        } message: {
            Text("Code steht unter dem QR-Code auf dem Ticket.")
        }
        .task {
            Feedback.prepare()
            if cameraStatus == .notDetermined {
                _ = await AVCaptureDevice.requestAccess(for: .video)
                cameraStatus = AVCaptureDevice.authorizationStatus(for: .video)
            }
        }
        .onChange(of: active) { _, isActive in if !isActive { torch = false } }
    }

    private var hintText: String {
        if !QRScanner.hasCamera { return "Keine Kamera – Code manuell eingeben" }
        if cameraStatus == .denied || cameraStatus == .restricted { return "Kein Kamerazugriff – in den Einstellungen erlauben" }
        return "QR-Code in den Rahmen halten"
    }

    private var controls: some View {
        HStack(spacing: 12) {
            Button { manualOpen = true } label: {
                Label("Code eingeben", systemImage: "keyboard").frame(maxWidth: .infinity)
            }
            .controlSize(.large)
            .tint(.white)
            .glassButtonStyle()
            if QRScanner.hasCamera && cameraStatus == .authorized {
                Button { torch.toggle() } label: {
                    Image(systemName: torch ? "flashlight.on.fill" : "flashlight.off.fill")
                        .frame(width: 24, height: 24)
                }
                .buttonBorderShape(.circle)
                .controlSize(.large)
                .tint(torch ? .yellow : .white)
                .glassButtonStyle()
                .accessibilityLabel(torch ? "Taschenlampe aus" : "Taschenlampe an")
            }
            if cameraStatus == .denied || cameraStatus == .restricted {
                Button {
                    if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                } label: { Image(systemName: "gearshape").frame(width: 24, height: 24) }
                .buttonBorderShape(.circle).controlSize(.large).tint(.white).glassButtonStyle()
                .accessibilityLabel("Einstellungen öffnen")
            }
        }
    }

    private var cameraRunning: Bool { active && scenePhase == .active && !manualOpen }

    @ViewBuilder private var camera: some View {
        if QRScanner.hasCamera && cameraStatus == .authorized {
            ZStack {
                QRScanner(active: cameraRunning, torch: torch && cameraRunning, onCode: handleScan)
                ViewfinderFrame().frame(width: 250, height: 250).allowsHitTesting(false)
            }
        } else {
            ZStack {
                LinearGradient(colors: [Color(white: 0.16), Color(white: 0.04)], startPoint: .top, endPoint: .bottom)
                ViewfinderFrame().frame(width: 250, height: 250).opacity(0.35)
                Image(systemName: "qrcode").font(.system(size: 60, weight: .light)).foregroundStyle(.white.opacity(0.25))
            }
        }
    }

    private func handleScan(_ code: String) {
        guard !busy else { return }
        let now = Date()
        if code == lastCode, now.timeIntervalSince(lastTime) < Config.debounceSeconds { return }
        lastCode = code
        lastTime = now
        send(.code(code))
    }

    private func send(_ req: CheckinRequest) {
        busy = true
        Task {
            let result: ScanOutcome
            do {
                let r: CheckinResponse
                switch req {
                case .code(let c): r = try await model.call { try await $0.checkin(code: c) }
                case .ticket(let id): r = try await model.call { try await $0.checkin(ticketId: id) }
                }
                result = .response(r)
            } catch APIError.unauthorized {
                busy = false
                return
            } catch {
                result = .failure(error.localizedDescription, retry: req)
            }
            Feedback.play(result.feedback)
            withAnimation(.snappy(duration: 0.2)) {
                outcome = result
                resultID += 1
            }
            busy = false
            // Zeitfenster der Entprellung ab Ergebnis neu starten
            lastTime = Date()
            await model.refreshStats()
        }
    }
}

/// Weiße Ecken als Zielrahmen.
struct ViewfinderFrame: View {
    var body: some View {
        GeometryReader { geo in
            let s = min(geo.size.width, geo.size.height)
            let l = s * 0.18
            Path { p in
                let r = CGRect(x: (geo.size.width - s) / 2, y: (geo.size.height - s) / 2, width: s, height: s)
                p.move(to: CGPoint(x: r.minX, y: r.minY + l)); p.addLine(to: CGPoint(x: r.minX, y: r.minY)); p.addLine(to: CGPoint(x: r.minX + l, y: r.minY))
                p.move(to: CGPoint(x: r.maxX - l, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY)); p.addLine(to: CGPoint(x: r.maxX, y: r.minY + l))
                p.move(to: CGPoint(x: r.minX, y: r.maxY - l)); p.addLine(to: CGPoint(x: r.minX, y: r.maxY)); p.addLine(to: CGPoint(x: r.minX + l, y: r.maxY))
                p.move(to: CGPoint(x: r.maxX - l, y: r.maxY)); p.addLine(to: CGPoint(x: r.maxX, y: r.maxY)); p.addLine(to: CGPoint(x: r.maxX, y: r.maxY - l))
            }
            .stroke(Color.white, style: StrokeStyle(lineWidth: 4, lineCap: .round, lineJoin: .round))
        }
    }
}
