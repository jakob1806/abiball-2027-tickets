import AVFoundation
import SwiftUI
import UIKit

/// Kamera-Vorschau, die nur QR-Codes erkennt (AVFoundation – schnell und mit Taschenlampe).
struct QRScanner: UIViewControllerRepresentable {
    var active: Bool
    var torch: Bool
    var onCode: (String) -> Void

    func makeUIViewController(context: Context) -> QRScannerController {
        let c = QRScannerController()
        c.onCode = onCode
        return c
    }

    func updateUIViewController(_ c: QRScannerController, context: Context) {
        c.onCode = onCode
        c.setActive(active)
        c.setTorch(torch)
    }

    static var hasCamera: Bool { AVCaptureDevice.default(for: .video) != nil }
}

final class QRScannerController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onCode: ((String) -> Void)?
    private let session = AVCaptureSession()
    private let queue = DispatchQueue(label: "qr.session")
    private var preview: AVCaptureVideoPreviewLayer?
    private var device: AVCaptureDevice?
    private var configured = false
    private var wantActive = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        let p = AVCaptureVideoPreviewLayer(session: session)
        p.videoGravity = .resizeAspectFill
        view.layer.addSublayer(p)
        preview = p
        queue.async { [weak self] in self?.configure() }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        preview?.frame = view.bounds
    }

    private func configure() {
        guard let dev = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
                ?? AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: dev) else { return }
        session.beginConfiguration()
        session.sessionPreset = .high
        if session.canAddInput(input) { session.addInput(input) }
        let output = AVCaptureMetadataOutput()
        if session.canAddOutput(output) {
            session.addOutput(output)
            output.setMetadataObjectsDelegate(self, queue: .main)
            output.metadataObjectTypes = [.qr]
        }
        session.commitConfiguration()
        if (try? dev.lockForConfiguration()) != nil {
            if dev.isFocusModeSupported(.continuousAutoFocus) { dev.focusMode = .continuousAutoFocus }
            if dev.isAutoFocusRangeRestrictionSupported { dev.autoFocusRangeRestriction = .near }
            dev.unlockForConfiguration()
        }
        device = dev
        configured = true
        if wantActive { session.startRunning() }
    }

    func setActive(_ active: Bool) {
        queue.async { [weak self] in
            guard let self else { return }
            self.wantActive = active
            guard self.configured else { return }
            if active, !self.session.isRunning { self.session.startRunning() }
            if !active, self.session.isRunning { self.session.stopRunning() }
        }
    }

    func setTorch(_ on: Bool) {
        queue.async { [weak self] in
            guard let dev = self?.device, dev.hasTorch, (try? dev.lockForConfiguration()) != nil else { return }
            dev.torchMode = on ? .on : .off
            dev.unlockForConfiguration()
        }
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objects: [AVMetadataObject], from connection: AVCaptureConnection) {
        for o in objects {
            if let qr = o as? AVMetadataMachineReadableCodeObject, let s = qr.stringValue, !s.isEmpty {
                onCode?(s)
                return
            }
        }
    }
}
