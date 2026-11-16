import AVFoundation
import UIKit

/// Haptik und kurze Töne je Scan-Ergebnis.
@MainActor
enum Feedback {
    enum Kind { case ok, duplicate, error }

    private static var players: [Kind: AVAudioPlayer] = [:]

    static func prepare() {
        try? AVAudioSession.sharedInstance().setCategory(.playback, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        for k in [Kind.ok, .duplicate, .error] {
            if let p = try? AVAudioPlayer(data: wav(for: k)) {
                p.prepareToPlay()
                players[k] = p
            }
        }
    }

    static func play(_ kind: Kind) {
        let gen = UINotificationFeedbackGenerator()
        switch kind {
        case .ok: gen.notificationOccurred(.success)
        case .duplicate: gen.notificationOccurred(.warning)
        case .error: gen.notificationOccurred(.error)
        }
        guard UserDefaults.standard.object(forKey: "soundOn") as? Bool ?? true else { return }
        if players.isEmpty { prepare() }
        if let p = players[kind] {
            p.currentTime = 0
            p.play()
        }
    }

    /// Töne als (Frequenz, Dauer); Frequenz 0 = Pause.
    private static func tones(for kind: Kind) -> [(Double, Double)] {
        switch kind {
        case .ok: return [(988, 0.09), (1319, 0.16)]
        case .duplicate: return [(740, 0.12), (0, 0.06), (740, 0.12)]
        case .error: return [(330, 0.18), (0, 0.04), (220, 0.32)]
        }
    }

    private static func wav(for kind: Kind) -> Data {
        let rate = 44_100.0
        var samples: [Int16] = []
        for (f, d) in tones(for: kind) {
            let n = Int(rate * d)
            for i in 0..<n {
                let t = Double(i) / rate
                // weiches Ein-/Ausblenden gegen Knacken
                let env = min(1, Double(i) / 400, Double(n - i) / 400)
                let v = f == 0 ? 0 : sin(2 * .pi * f * t) * 0.6 * env
                samples.append(Int16(v * Double(Int16.max)))
            }
        }
        var d = Data()
        func u32(_ v: UInt32) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
        func u16(_ v: UInt16) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
        let dataSize = UInt32(samples.count * 2)
        d.append(contentsOf: Array("RIFF".utf8)); u32(36 + dataSize)
        d.append(contentsOf: Array("WAVE".utf8))
        d.append(contentsOf: Array("fmt ".utf8)); u32(16); u16(1); u16(1); u32(UInt32(rate)); u32(UInt32(rate) * 2); u16(2); u16(16)
        d.append(contentsOf: Array("data".utf8)); u32(dataSize)
        samples.withUnsafeBytes { d.append(contentsOf: $0) }
        return d
    }
}
