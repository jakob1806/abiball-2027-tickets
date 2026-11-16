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
        VStack(spacing: 12) {
            ScreenHeader(title: "Einlass")
            StatsBar()
            camera
                .frame(maxWidth: .infinity)
                .frame(minHeight: 200)
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .overlay(alignment: .bottomTrailing) { cameraButtons }
                .overlay { if busy { ProgressView().controlSize(.large).tint(.white) } }
            resultArea
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
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

    private var cameraRunning: Bool { active && scenePhase == .active && !manualOpen }

    @ViewBuilder private var camera: some View {
        if !QRScanner.hasCamera {
            placeholder(icon: "camera.fill", text: "Keine Kamera verfügbar.\nBitte Code manuell eingeben.")
        } else if cameraStatus == .denied || cameraStatus == .restricted {
            VStack(spacing: 12) {
                placeholder(icon: "camera.badge.ellipsis", text: "Kein Zugriff auf die Kamera.")
                Button("Einstellungen öffnen") {
                    if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                }
                .buttonStyle(BlackButtonStyle(inverted: true)).frame(width: 240)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color.black)
        } else if cameraStatus == .authorized {
            ZStack {
                QRScanner(active: cameraRunning, torch: torch && cameraRunning, onCode: handleScan)
                ViewfinderFrame().padding(40).allowsHitTesting(false)
            }
        } else {
            Color.black
        }
    }

    private func placeholder(icon: String, text: String) -> some View {
        VStack(spacing: 10) {
            Image(systemName: icon).font(.system(size: 36))
            Text(text).font(.headline).multilineTextAlignment(.center)
        }
        .foregroundStyle(.white.opacity(0.85))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black)
    }

    private var cameraButtons: some View {
        HStack(spacing: 10) {
            Button { manualOpen = true } label: {
                Label("Code eingeben", systemImage: "keyboard")
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 14).padding(.vertical, 10)
                    .background(Capsule().fill(.white))
                    .foregroundStyle(.black)
            }
            if QRScanner.hasCamera && cameraStatus == .authorized {
                Button { torch.toggle() } label: {
                    Image(systemName: torch ? "flashlight.on.fill" : "flashlight.off.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: 44, height: 44)
                        .background(Circle().fill(torch ? Color.yellow : .white))
                        .foregroundStyle(.black)
                }
                .accessibilityLabel(torch ? "Taschenlampe aus" : "Taschenlampe an")
            }
        }
        .padding(12)
    }

    @ViewBuilder private var resultArea: some View {
        if let outcome {
            ResultCard(result: outcome)
                .id(resultID)
                .transition(.scale(scale: 0.96).combined(with: .opacity))
                .onTapGesture {
                    if case .failure(_, let retry) = outcome { send(retry) } else { withAnimation { self.outcome = nil } }
                }
        } else {
            VStack(spacing: 6) {
                Image(systemName: "qrcode").font(.system(size: 34))
                Text("QR-Code in den Rahmen halten").font(.headline)
            }
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 22)
            .background(RoundedRectangle(cornerRadius: 22).strokeBorder(Color(.separator), style: StrokeStyle(lineWidth: 1.5, dash: [6, 5])))
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
            .stroke(Color.white, style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round))
        }
    }
}
