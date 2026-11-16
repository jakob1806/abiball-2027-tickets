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
    @State private var showStats = false

    var body: some View {
        ZStack {
            camera.ignoresSafeArea()

            // Mitte: Scan-Quadrat mit kleinen Symbolen darunter
            VStack(spacing: 22) {
                ViewfinderFrame().frame(width: 250, height: 250)
                    .opacity(cameraLive ? 1 : 0.35)
                    .overlay { if busy { ProgressView().controlSize(.large).tint(.white) } }
                    .allowsHitTesting(false)
                controls
                if !cameraLive {
                    Text(hintText).font(.footnote).foregroundStyle(.white.opacity(0.6))
                }
            }

            VStack(spacing: 12) {
                // Oben: Zahlen und Konto
                HStack(alignment: .top, spacing: 10) {
                    Button { showStats = true } label: { StatsPill() }
                        .buttonStyle(.plain)
                        .accessibilityHint("Zeigt die Details")
                    Spacer(minLength: 0)
                    AccountMenu()
                }
                Spacer(minLength: 0)
                // Unten: Ergebnis (Kamera scannt währenddessen weiter)
                if let outcome {
                    ResultCard(
                        result: outcome,
                        onRetry: { if case .failure(_, let retry) = outcome { send(retry) } }
                    )
                    .id(resultID)
                    .onTapGesture { withAnimation(.snappy) { self.outcome = nil } }
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
        .task(id: resultID) {
            // Grünes Ergebnis blendet sich von selbst aus; Warnungen bleiben bis zum nächsten Scan stehen.
            guard case .response(let r)? = outcome, r.result == "ok" else { return }
            try? await Task.sleep(for: .seconds(3))
            guard !Task.isCancelled else { return }
            withAnimation(.snappy) { outcome = nil }
        }
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showStats) {
            StatsDetailView()
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .alert("Code eingeben", isPresented: $manualOpen) {
            TextField("WG27-XXXX-XXXX-XXXX", text: $manualCode)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .onSubmit {
                    let c = manualCode.trimmingCharacters(in: .whitespacesAndNewlines)
                    manualCode = ""
                    manualOpen = false
                    if !c.isEmpty { send(.code(c)) }
                }
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
        if !QRScanner.hasCamera { return "Keine Kamera" }
        if cameraStatus == .denied || cameraStatus == .restricted { return "Kein Kamerazugriff" }
        return ""
    }

    private var cameraLive: Bool { QRScanner.hasCamera && cameraStatus == .authorized }

    /// Zwei kleine runde Glas-Symbole: Code eintippen und Taschenlampe.
    private var controls: some View {
        HStack(spacing: 18) {
            iconButton("keyboard", label: "Code eingeben") { manualOpen = true }
            iconButton(torch ? "flashlight.on.fill" : "flashlight.off.fill",
                       label: torch ? "Taschenlampe aus" : "Taschenlampe an",
                       tint: torch ? .yellow : .white) { torch.toggle() }
                .disabled(!cameraLive)
                .opacity(cameraLive ? 1 : 0.4)
            if cameraStatus == .denied || cameraStatus == .restricted {
                iconButton("gearshape", label: "Einstellungen öffnen") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                }
            }
        }
    }

    private func iconButton(_ icon: String, label: String, tint: Color = .white, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 17, weight: .medium)).frame(width: 26, height: 26)
        }
        .buttonBorderShape(.circle)
        .controlSize(.large)
        .tint(tint)
        .glassButtonStyle()
        .accessibilityLabel(label)
    }

    private var cameraRunning: Bool { active && scenePhase == .active && !manualOpen }

    @ViewBuilder private var camera: some View {
        if QRScanner.hasCamera && cameraStatus == .authorized {
            ZStack {
                QRScanner(active: cameraRunning, torch: torch && cameraRunning, onCode: handleScan)
            }
        } else {
            ZStack {
                LinearGradient(colors: [Color(white: 0.16), Color(white: 0.04)], startPoint: .top, endPoint: .bottom)
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
