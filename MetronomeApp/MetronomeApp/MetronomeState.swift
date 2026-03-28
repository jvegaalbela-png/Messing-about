import Foundation

// MARK: - Shared Types

enum BeatState: String, Codable, Equatable {
    case normal, accent, mute

    var next: BeatState {
        switch self {
        case .normal: return .accent
        case .accent: return .mute
        case .mute: return .normal
        }
    }

    var icon: String {
        switch self {
        case .normal: return "●"
        case .accent: return "▲"
        case .mute: return "✕"
        }
    }
}

enum ClickType: Equatable {
    case accent, beat, sub, mute
}

enum SoundMode: String, CaseIterable, Equatable {
    case electronic = "Electronic"
    case clave = "Clave"

    var icon: String {
        switch self {
        case .electronic: return "∿"
        case .clave: return "▮"
        }
    }
}

enum GapPhase: Equatable {
    case idle, play, silent
}

struct FormEntry: Identifiable, Codable, Equatable {
    let id: UUID
    var beats: Int
    var unit: Int
    var states: [BeatState]

    init(beats: Int = 4, unit: Int = 4, states: [BeatState]? = nil) {
        self.id = UUID()
        self.beats = beats
        self.unit = unit
        if let states = states {
            self.states = states
        } else {
            var s = Array(repeating: BeatState.normal, count: beats)
            if !s.isEmpty { s[0] = .accent }
            self.states = s
        }
    }
}

// MARK: - Observable State

@Observable
class MetronomeState {
    // Core
    var bpm: Double = 120
    var beatsPerMeasure: Int = 4
    var beatUnit: Int = 4
    var subdivision: Int = 1
    var beatStates: [BeatState] = [.accent, .normal, .normal, .normal]
    var isPlaying: Bool = false
    var soundMode: SoundMode = .electronic

    // Visual feedback (updated by engine)
    var currentBeat: Int = -1
    var currentSub: Int = 0
    var currentClickType: ClickType = .beat

    // Advanced
    var advancedEnabled: Bool = false
    var gapEnabled: Bool = false
    var gapPlay: Int = 2
    var gapSilent: Int = 2
    var randomMuteEnabled: Bool = false
    var randomMutePct: Int = 30
    var formEnabled: Bool = false
    var form: [FormEntry] = [FormEntry()]

    // Gap visual
    var gapPhase: GapPhase = .idle
    var gapMeasureCount: Int = 0
    var currentFormIndex: Int = 0

    // Tap tempo
    private var tapTimes: [Date] = []

    // Form undo/redo
    var formHistory: [[FormEntry]] = []
    var formHistoryIndex: Int = -1

    // MARK: - Tempo

    static let tempoMarks: [(maxBPM: Int, name: String)] = [
        (24, "Larghissimo"), (39, "Grave"), (54, "Largo"),
        (64, "Larghetto"), (74, "Adagio"), (79, "Adagietto"),
        (93, "Andante"), (107, "Andantino"), (119, "Moderato"),
        (129, "Allegretto"), (167, "Allegro"), (179, "Vivace"),
        (199, "Presto"), (500, "Prestissimo")
    ]

    var tempoName: String {
        let b = Int(bpm)
        for (max, name) in Self.tempoMarks {
            if b <= max { return name }
        }
        return "Prestissimo"
    }

    func setBPM(_ value: Double) {
        bpm = max(1, min(500, value.rounded()))
    }

    // MARK: - Time Signature

    func setTimeSig(beats: Int, unit: Int) {
        let b = max(1, min(32, beats))
        let prev = beatStates
        beatsPerMeasure = b
        beatUnit = unit

        var newStates = [BeatState]()
        for i in 0..<b {
            newStates.append(i < prev.count ? prev[i] : .normal)
        }
        if prev.isEmpty && !newStates.isEmpty { newStates[0] = .accent }
        beatStates = newStates

        if currentBeat >= b { currentBeat = -1 }
    }

    // MARK: - Tap Tempo

    func tapTempo() {
        let now = Date()
        tapTimes.append(now)
        tapTimes = tapTimes.filter { now.timeIntervalSince($0) < 4 }.suffix(8).map { $0 }

        if tapTimes.count >= 2 {
            var intervals: [TimeInterval] = []
            for i in 1..<tapTimes.count {
                intervals.append(tapTimes[i].timeIntervalSince(tapTimes[i - 1]))
            }
            let avg = intervals.reduce(0, +) / Double(intervals.count)
            setBPM(60.0 / avg)
        }
    }

    // MARK: - Form Management

    func saveFormSnapshot() {
        formHistory = Array(formHistory.prefix(formHistoryIndex + 1))
        formHistory.append(form)
        if formHistory.count > 80 { formHistory.removeFirst() }
        formHistoryIndex = formHistory.count - 1
    }

    func undoForm() {
        guard formHistoryIndex > 0 else { return }
        formHistoryIndex -= 1
        form = formHistory[formHistoryIndex]
    }

    func redoForm() {
        guard formHistoryIndex < formHistory.count - 1 else { return }
        formHistoryIndex += 1
        form = formHistory[formHistoryIndex]
    }

    var canUndoForm: Bool { formHistoryIndex > 0 }
    var canRedoForm: Bool { formHistoryIndex < formHistory.count - 1 }

    func addFormMeasure() {
        guard form.count < 256 else { return }
        saveFormSnapshot()
        let last = form.last ?? FormEntry()
        form.append(FormEntry(beats: last.beats, unit: last.unit))
    }

    func deleteFormEntry(at index: Int) {
        guard form.count > 1 else { return }
        saveFormSnapshot()
        form.remove(at: index)
    }

    func initFormHistory() {
        formHistory = [form]
        formHistoryIndex = 0
    }

    // MARK: - Active beat states for engine

    var effectiveBeats: Int {
        if formEnabled && !form.isEmpty {
            let idx = max(0, min(currentFormIndex, form.count - 1))
            return form[idx].beats
        }
        return beatsPerMeasure
    }

    var effectiveStates: [BeatState] {
        if formEnabled && !form.isEmpty {
            let idx = max(0, min(currentFormIndex, form.count - 1))
            return form[idx].states
        }
        return beatStates
    }
}
