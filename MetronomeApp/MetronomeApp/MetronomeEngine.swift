import AVFoundation
import os

final class MetronomeEngine {
    private let engine = AVAudioEngine()
    private var sourceNode: AVAudioSourceNode!
    private let sampleRate: Float = 44100

    // Lock-protected shared config
    private var configLock = os_unfair_lock_s()
    private var sharedConfig = AudioConfig()

    // Audio-thread-only state
    private var sampleCounter: Int64 = 0
    private var nextClickSample: Int64 = 0
    private var beatIndex: Int = 0
    private var subIndex: Int = 0
    private var activeOscillators: [Oscillator] = []
    private var gapPhase: GapPhase = .play
    private var gapMeasureCount: Int = 0
    private var formIndex: Int = 0

    // Beat event for UI polling
    private var eventLock = os_unfair_lock_s()
    private var latestEvent = BeatEvent()
    private var lastPolledVersion: UInt64 = 0

    private var displayTimer: Timer?
    weak var state: MetronomeState?

    // MARK: - Types

    struct AudioConfig {
        var bpm: Double = 120
        var beatsPerMeasure: Int = 4
        var subdivision: Int = 1
        var beatStates: [BeatState] = [.accent, .normal, .normal, .normal]
        var soundMode: SoundMode = .electronic
        var isPlaying: Bool = false
        var gapEnabled: Bool = false
        var gapPlay: Int = 2
        var gapSilent: Int = 2
        var randomMuteEnabled: Bool = false
        var randomMutePct: Int = 30
        var formEnabled: Bool = false
        var form: [FormEntry] = []
    }

    struct BeatEvent {
        var beat: Int = -1
        var sub: Int = 0
        var clickType: ClickType = .beat
        var gapPhase: GapPhase = .idle
        var gapMeasureCount: Int = 0
        var formIndex: Int = 0
        var version: UInt64 = 0
    }

    struct Oscillator {
        let startSample: Int64
        let frequency: Float
        let attackDuration: Float
        let decayConstant: Float
        let totalDuration: Float
        let volume: Float
    }

    // MARK: - Init

    init() {
        let fmt = AVAudioFormat(standardFormatWithSampleRate: Double(sampleRate), channels: 1)!

        sourceNode = AVAudioSourceNode(format: fmt) { [unowned self] _, _, frameCount, bufferList in
            self.render(frameCount: frameCount, bufferList: bufferList)
        }

        engine.attach(sourceNode)
        engine.connect(sourceNode, to: engine.mainMixerNode, format: fmt)
    }

    // MARK: - Public

    func updateConfig(from s: MetronomeState) {
        os_unfair_lock_lock(&configLock)
        sharedConfig.bpm = s.bpm
        sharedConfig.beatsPerMeasure = s.beatsPerMeasure
        sharedConfig.subdivision = s.subdivision
        sharedConfig.beatStates = s.beatStates
        sharedConfig.soundMode = s.soundMode
        sharedConfig.isPlaying = s.isPlaying
        sharedConfig.gapEnabled = s.gapEnabled
        sharedConfig.gapPlay = s.gapPlay
        sharedConfig.gapSilent = s.gapSilent
        sharedConfig.randomMuteEnabled = s.randomMuteEnabled
        sharedConfig.randomMutePct = s.randomMutePct
        sharedConfig.formEnabled = s.formEnabled
        sharedConfig.form = s.form
        os_unfair_lock_unlock(&configLock)
    }

    func start() {
        // Reset audio state
        sampleCounter = 0
        nextClickSample = 0
        beatIndex = 0
        subIndex = 0
        activeOscillators = []
        gapPhase = .play
        gapMeasureCount = 0
        formIndex = 0

        os_unfair_lock_lock(&eventLock)
        latestEvent = BeatEvent()
        os_unfair_lock_unlock(&eventLock)
        lastPolledVersion = 0

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
            if !engine.isRunning {
                try engine.start()
            }
        } catch {
            print("MetronomeEngine start error: \(error)")
        }

        startDisplayTimer()
    }

    func stop() {
        if engine.isRunning {
            engine.stop()
        }
        displayTimer?.invalidate()
        displayTimer = nil

        DispatchQueue.main.async { [weak self] in
            guard let s = self?.state else { return }
            s.currentBeat = -1
            s.currentSub = 0
            s.gapPhase = .idle
        }
    }

    // MARK: - Audio Render

    private func render(frameCount: UInt32, bufferList: UnsafeMutablePointer<AudioBufferList>) -> OSStatus {
        let abl = UnsafeMutableAudioBufferListPointer(bufferList)
        guard let buf = abl.first, let data = buf.mData?.assumingMemoryBound(to: Float.self) else {
            return noErr
        }

        // Read config snapshot
        os_unfair_lock_lock(&configLock)
        let cfg = sharedConfig
        os_unfair_lock_unlock(&configLock)

        let count = Int(frameCount)

        guard cfg.isPlaying else {
            for i in 0..<count { data[i] = 0 }
            return noErr
        }

        for i in 0..<count {
            let currentSample = sampleCounter + Int64(i)

            // Trigger click when due
            if currentSample >= nextClickSample {
                triggerClick(at: currentSample, cfg: cfg)
            }

            // Sum active oscillators
            var sample: Float = 0
            for osc in activeOscillators {
                let t = Float(currentSample - osc.startSample) / sampleRate
                if t >= 0 && t < osc.totalDuration {
                    let sine = sinf(2.0 * .pi * osc.frequency * t)
                    let attack = min(t / osc.attackDuration, 1.0)
                    let decay = expf(-t / osc.decayConstant)
                    sample += sine * attack * decay * osc.volume
                }
            }

            data[i] = max(-1.0, min(1.0, sample))
        }

        sampleCounter += Int64(count)

        // Prune finished oscillators
        activeOscillators.removeAll { osc in
            Float(sampleCounter - osc.startSample) / sampleRate >= osc.totalDuration
        }

        return noErr
    }

    // MARK: - Click Trigger (audio thread)

    private func triggerClick(at sample: Int64, cfg: AudioConfig) {
        // Determine effective meter
        let effBeats: Int
        let effStates: [BeatState]

        if cfg.formEnabled && !cfg.form.isEmpty {
            let entry = cfg.form[formIndex % cfg.form.count]
            effBeats = entry.beats
            effStates = entry.states
        } else {
            effBeats = cfg.beatsPerMeasure
            effStates = cfg.beatStates
        }

        // Click type
        var clickType: ClickType
        if subIndex == 0 {
            let bs = beatIndex < effStates.count ? effStates[beatIndex] : .normal
            switch bs {
            case .accent: clickType = .accent
            case .mute: clickType = .mute
            case .normal: clickType = .beat
            }
        } else {
            clickType = .sub
        }

        // Gap click override
        if cfg.gapEnabled && gapPhase == .silent {
            clickType = .mute
        }

        // Random mute
        if cfg.randomMuteEnabled && subIndex == 0 && clickType != .mute {
            if Float.random(in: 0..<100) < Float(cfg.randomMutePct) {
                clickType = .mute
            }
        }

        // Generate sound
        if clickType != .mute {
            activeOscillators.append(makeOscillator(clickType, mode: cfg.soundMode, at: sample))
        }

        // Post event
        os_unfair_lock_lock(&eventLock)
        latestEvent.beat = beatIndex
        latestEvent.sub = subIndex
        latestEvent.clickType = clickType
        latestEvent.gapPhase = cfg.gapEnabled ? gapPhase : .idle
        latestEvent.gapMeasureCount = gapMeasureCount
        latestEvent.formIndex = formIndex
        latestEvent.version &+= 1
        os_unfair_lock_unlock(&eventLock)

        // Advance timing
        let samplesPerSub = (Double(sampleRate) * 60.0 / cfg.bpm) / Double(max(1, cfg.subdivision))
        nextClickSample = sample + Int64(samplesPerSub)

        // Advance beat/sub position
        subIndex += 1
        if subIndex >= cfg.subdivision {
            subIndex = 0
            beatIndex += 1
            if beatIndex >= effBeats {
                beatIndex = 0

                // Gap phase transition
                if cfg.gapEnabled {
                    gapMeasureCount += 1
                    if gapPhase == .play && gapMeasureCount >= cfg.gapPlay {
                        gapPhase = .silent; gapMeasureCount = 0
                    } else if gapPhase == .silent && gapMeasureCount >= cfg.gapSilent {
                        gapPhase = .play; gapMeasureCount = 0
                    }
                }

                // Advance form
                if cfg.formEnabled && !cfg.form.isEmpty {
                    formIndex = (formIndex + 1) % cfg.form.count
                }
            }
        }
    }

    // MARK: - Sound Synthesis

    private func makeOscillator(_ type: ClickType, mode: SoundMode, at sample: Int64) -> Oscillator {
        switch mode {
        case .electronic:
            switch type {
            case .accent:
                return Oscillator(startSample: sample, frequency: 1050,
                                  attackDuration: 0.001, decayConstant: 0.025,
                                  totalDuration: 0.15, volume: 0.9)
            case .beat:
                return Oscillator(startSample: sample, frequency: 800,
                                  attackDuration: 0.001, decayConstant: 0.02,
                                  totalDuration: 0.12, volume: 0.7)
            case .sub:
                return Oscillator(startSample: sample, frequency: 1600,
                                  attackDuration: 0.001, decayConstant: 0.012,
                                  totalDuration: 0.06, volume: 0.3)
            case .mute:
                return Oscillator(startSample: sample, frequency: 0,
                                  attackDuration: 0, decayConstant: 1,
                                  totalDuration: 0, volume: 0)
            }
        case .clave:
            switch type {
            case .accent:
                return Oscillator(startSample: sample, frequency: 1500,
                                  attackDuration: 0.0008, decayConstant: 0.012,
                                  totalDuration: 0.08, volume: 1.0)
            case .beat:
                return Oscillator(startSample: sample, frequency: 1150,
                                  attackDuration: 0.0008, decayConstant: 0.009,
                                  totalDuration: 0.06, volume: 0.75)
            case .sub:
                return Oscillator(startSample: sample, frequency: 2000,
                                  attackDuration: 0.0005, decayConstant: 0.005,
                                  totalDuration: 0.03, volume: 0.35)
            case .mute:
                return Oscillator(startSample: sample, frequency: 0,
                                  attackDuration: 0, decayConstant: 1,
                                  totalDuration: 0, volume: 0)
            }
        }
    }

    // MARK: - Display Timer

    private func startDisplayTimer() {
        displayTimer?.invalidate()
        displayTimer = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { [weak self] _ in
            self?.pollEvent()
        }
    }

    private func pollEvent() {
        os_unfair_lock_lock(&eventLock)
        let ev = latestEvent
        os_unfair_lock_unlock(&eventLock)

        guard ev.version != lastPolledVersion else { return }
        lastPolledVersion = ev.version

        state?.currentBeat = ev.beat
        state?.currentSub = ev.sub
        state?.currentClickType = ev.clickType
        state?.gapPhase = ev.gapPhase
        state?.gapMeasureCount = ev.gapMeasureCount
        state?.currentFormIndex = ev.formIndex
    }
}
