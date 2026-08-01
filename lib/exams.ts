/**
 * Phase 5 — shared examination, anti-cheat and grading logic.
 *
 * Imported by both the API routes (server) and the exam UI (client), so
 * everything here stays free of Node/browser globals.
 *
 * Security note: `ExamQuestion` carries the answer key. Anything travelling
 * to a student must go through `stripAnswerKey()` first — the grading engine
 * runs server-side only, and the client is never trusted with a score.
 */

// --- Question model --------------------------------------------------------

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'ESSAY'

export interface QuestionOption {
  id: string
  text: string
}

export interface ExamQuestion {
  id: string
  type: QuestionType
  prompt: string
  points: number
  /** Empty for ESSAY. True/False is stored as two fixed options. */
  options: QuestionOption[]
  /** The answer key. Null for ESSAY, which needs a human. */
  correctOptionId: string | null
}

/** What the student portal is allowed to see — the key is removed. */
export type SafeQuestion = Omit<ExamQuestion, 'correctOptionId'>

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  MCQ: 'Multiple Choice',
  TRUE_FALSE: 'True / False',
  ESSAY: 'Short Answer / Essay',
}

/** Only closed-form questions can be scored without a teacher. */
export function isAutoGradable(type: QuestionType): boolean {
  return type === 'MCQ' || type === 'TRUE_FALSE'
}

export const TRUE_OPTION_ID = 'true'
export const FALSE_OPTION_ID = 'false'

export function trueFalseOptions(): QuestionOption[] {
  return [
    { id: TRUE_OPTION_ID, text: 'True' },
    { id: FALSE_OPTION_ID, text: 'False' },
  ]
}

// --- Student responses -----------------------------------------------------

/** What the client posts up: no scores, just what the student picked/wrote. */
export interface StudentResponse {
  questionId: string
  selectedOptionId: string | null
  text: string | null
}

/** What the engine stores: the response plus the points it earned. */
export interface StudentAnswer extends StudentResponse {
  /** True when the engine scored it; false when it awaits manual review. */
  autoGraded: boolean
  /** Null for essays until a teacher grades them. */
  isCorrect: boolean | null
  pointsAwarded: number
  maxPoints: number
  /** Per-question remark from the teacher. */
  feedback: string | null
}

// --- Anti-cheat telemetry --------------------------------------------------

export type ViolationType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'COPY'
  | 'PASTE'
  | 'CONTEXT_MENU'
  | 'DEVTOOLS'
  | 'LATE_SUBMIT'

export interface ViolationEvent {
  type: ViolationType
  /** UTC ISO string. */
  at: string
  detail?: string
}

export const VIOLATION_LABEL: Record<ViolationType, string> = {
  TAB_SWITCH: 'Switched tab or minimised the window',
  WINDOW_BLUR: 'Exam window lost focus',
  FULLSCREEN_EXIT: 'Left full-screen mode',
  COPY: 'Attempted to copy',
  PASTE: 'Attempted to paste',
  CONTEXT_MENU: 'Opened the right-click menu',
  DEVTOOLS: 'Attempted to open developer tools',
  LATE_SUBMIT: 'Submitted after the deadline',
}

/**
 * Only leaving the exam surface counts against the tab-switch budget.
 * Blocked copy/paste and right-clicks are logged for context but never
 * escalate a paper on their own — a student who reflexively hits Ctrl+C
 * hasn't cheated, and treating that as equivalent to leaving the tab would
 * bury the teacher in false positives.
 */
export const COUNTED_VIOLATIONS: ViolationType[] = [
  'TAB_SWITCH',
  'WINDOW_BLUR',
  'FULLSCREEN_EXIT',
]

export function countsAgainstBudget(type: ViolationType): boolean {
  return COUNTED_VIOLATIONS.includes(type)
}

export type RiskLevel = 'CLEAN' | 'WARN' | 'HIGH'

/**
 * `maxTabSwitches` is the exam's allowance. At the allowance the student is
 * warned; beyond it the paper is flagged as high risk for the teacher.
 */
export function riskLevel(tabSwitches: number, maxTabSwitches: number): RiskLevel {
  if (tabSwitches <= 0) return 'CLEAN'
  if (tabSwitches > maxTabSwitches) return 'HIGH'
  return 'WARN'
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  CLEAN: 'Clean',
  WARN: 'Minor Activity',
  HIGH: 'High Cheating Risk',
}

export const RISK_STYLE: Record<RiskLevel, string> = {
  CLEAN: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  WARN: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  HIGH: 'bg-red-50 text-red-700 ring-red-600/20',
}

// --- Grading engine --------------------------------------------------------

export interface GradingResult {
  answers: StudentAnswer[]
  /** Points awarded automatically (MCQ + True/False). */
  autoScore: number
  /** Total points available on the paper. */
  maxScore: number
  /** Points locked behind manual essay review. */
  pendingManualPoints: number
  autoGradedCount: number
  manualCount: number
}

/**
 * Score a submission against the answer key.
 *
 * Closed-form questions are all-or-nothing. Essays land at zero points with
 * `autoGraded: false` so the teacher's manual award is always additive —
 * `score = autoScore + Σ(manual awards)` — and re-releasing a grade can never
 * double-count the auto portion.
 *
 * Runs server-side only.
 */
export function gradeSubmission(
  questions: ExamQuestion[],
  responses: StudentResponse[]
): GradingResult {
  const byQuestionId = new Map(responses.map(r => [r.questionId, r]))

  let autoScore = 0
  let maxScore = 0
  let pendingManualPoints = 0
  let autoGradedCount = 0
  let manualCount = 0

  const answers: StudentAnswer[] = questions.map(question => {
    const response = byQuestionId.get(question.id)
    const maxPoints = Math.max(0, question.points)
    maxScore += maxPoints

    if (isAutoGradable(question.type)) {
      autoGradedCount += 1
      const selectedOptionId = response?.selectedOptionId ?? null
      const isCorrect =
        selectedOptionId !== null &&
        question.correctOptionId !== null &&
        selectedOptionId === question.correctOptionId

      const pointsAwarded = isCorrect ? maxPoints : 0
      autoScore += pointsAwarded

      return {
        questionId: question.id,
        selectedOptionId,
        text: null,
        autoGraded: true,
        isCorrect,
        pointsAwarded,
        maxPoints,
        feedback: null,
      }
    }

    manualCount += 1
    pendingManualPoints += maxPoints

    return {
      questionId: question.id,
      selectedOptionId: null,
      text: response?.text?.trim() || null,
      autoGraded: false,
      isCorrect: null,
      pointsAwarded: 0,
      maxPoints,
      feedback: null,
    }
  })

  return {
    answers,
    autoScore: round2(autoScore),
    maxScore: round2(maxScore),
    pendingManualPoints: round2(pendingManualPoints),
    autoGradedCount,
    manualCount,
  }
}

/** Auto points plus whatever the teacher awarded on the essay questions. */
export function totalAwarded(answers: StudentAnswer[]): number {
  return round2(answers.reduce((sum, a) => sum + (Number(a.pointsAwarded) || 0), 0))
}

export function totalPointsOf(questions: ExamQuestion[]): number {
  return round2(questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0))
}

/** Two decimals — enough for half-point rubrics without float noise. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function scorePct(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0
  return Math.round((score / maxScore) * 100)
}

export function hasPassed(score: number, maxScore: number, passingPct: number): boolean {
  return scorePct(score, maxScore) >= passingPct
}

/** Letter band for the gradebook overview. */
export function letterGrade(pct: number): string {
  if (pct >= 90) return 'A'
  if (pct >= 80) return 'B'
  if (pct >= 70) return 'C'
  if (pct >= 60) return 'D'
  return 'F'
}

// --- Question sanitising ---------------------------------------------------

/** Strip the answer key before a paper reaches a student. */
export function stripAnswerKey(questions: ExamQuestion[]): SafeQuestion[] {
  return questions.map(({ correctOptionId, ...safe }) => safe)
}

/**
 * Validate and normalise a builder payload. Returns the clean questions or a
 * human-readable error — the API never trusts the shape the client posts.
 */
export function normalizeQuestions(
  raw: unknown
): { questions: ExamQuestion[]; error: null } | { questions: null; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { questions: null, error: 'Add at least one question.' }
  }

  const questions: ExamQuestion[] = []
  const seenIds = new Set<string>()

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as Partial<ExamQuestion> | null
    const position = i + 1

    if (!item || typeof item !== 'object') {
      return { questions: null, error: `Question ${position} is malformed.` }
    }

    const type = item.type
    if (type !== 'MCQ' && type !== 'TRUE_FALSE' && type !== 'ESSAY') {
      return { questions: null, error: `Question ${position} has an unknown type.` }
    }

    const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : ''
    if (!prompt) {
      return { questions: null, error: `Question ${position} is missing its prompt.` }
    }

    const points = Number(item.points)
    if (!Number.isFinite(points) || points <= 0) {
      return { questions: null, error: `Question ${position} needs a point value above zero.` }
    }

    // Ids come from the client but must stay unique within a paper — answers
    // are matched back by id at grading time.
    let id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `q${position}`
    while (seenIds.has(id)) id = `${id}-${position}`
    seenIds.add(id)

    if (type === 'ESSAY') {
      questions.push({ id, type, prompt, points: round2(points), options: [], correctOptionId: null })
      continue
    }

    const rawOptions = type === 'TRUE_FALSE' ? trueFalseOptions() : item.options
    if (!Array.isArray(rawOptions) || rawOptions.length < 2) {
      return { questions: null, error: `Question ${position} needs at least two options.` }
    }

    const options: QuestionOption[] = []
    const seenOptionIds = new Set<string>()

    for (let j = 0; j < rawOptions.length; j++) {
      const opt = rawOptions[j] as Partial<QuestionOption> | null
      const text = opt && typeof opt.text === 'string' ? opt.text.trim() : ''
      if (!text) {
        return { questions: null, error: `Question ${position} has an empty option.` }
      }
      let optId = opt && typeof opt.id === 'string' && opt.id.trim() ? opt.id.trim() : `o${j + 1}`
      while (seenOptionIds.has(optId)) optId = `${optId}-${j + 1}`
      seenOptionIds.add(optId)
      options.push({ id: optId, text })
    }

    const correctOptionId =
      typeof item.correctOptionId === 'string' ? item.correctOptionId.trim() : ''
    if (!correctOptionId || !options.some(o => o.id === correctOptionId)) {
      return { questions: null, error: `Mark the correct answer for question ${position}.` }
    }

    questions.push({ id, type, prompt, points: round2(points), options, correctOptionId })
  }

  return { questions, error: null }
}

// --- Deterministic shuffling ----------------------------------------------

/**
 * xmur3 string hash — turns a seed string into a 32-bit integer.
 * Not cryptographic; it only needs to spread evenly.
 */
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return (h ^= h >>> 16) >>> 0
}

/** mulberry32 — small, fast, seedable PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Fisher-Yates driven by a seeded PRNG.
 *
 * Seeded rather than random so a student who reloads mid-exam gets the *same*
 * order back — otherwise the shuffle would scramble their place in the paper
 * every refresh — while two students still get different orders.
 */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  const rand = mulberry32(hashSeed(seed))
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Shuffle the paper and each question's choices from one stable seed. */
export function randomizePaper<T extends SafeQuestion>(questions: T[], seed: string): T[] {
  return seededShuffle(questions, seed).map(q => ({
    ...q,
    options: q.options.length > 1 ? seededShuffle(q.options, `${seed}:${q.id}`) : q.options,
  }))
}

// --- Timing ----------------------------------------------------------------

/**
 * Slack allowed between the client's auto-submit firing and the request
 * landing. Without it, every timed-out paper would be flagged for lateness
 * on a slow connection.
 */
export const SUBMIT_GRACE_SEC = 30

/** Server-authoritative deadline for an attempt. */
export function deadlineFor(startedAt: Date | string, durationMins: number): Date {
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt
  return new Date(start.getTime() + durationMins * 60 * 1000)
}

export function secondsRemaining(deadline: Date | string, now: Date = new Date()): number {
  const end = typeof deadline === 'string' ? new Date(deadline) : deadline
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000))
}

/** `95` -> `"01:35"`, `3725` -> `"1:02:05"`. */
export function formatCountdown(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Countdown urgency drives the timer's colour. */
export function timerTone(secondsLeft: number, durationMins: number): 'calm' | 'warn' | 'critical' {
  if (secondsLeft <= 60) return 'critical'
  if (secondsLeft <= Math.max(120, durationMins * 60 * 0.1)) return 'warn'
  return 'calm'
}

// --- Wire payloads ---------------------------------------------------------

export interface ExamAntiCheatConfig {
  forceFullscreen: boolean
  trackTabSwitches: boolean
  maxTabSwitches: number
  blockCopyPaste: boolean
  randomizeOrder: boolean
}

/** Row in the teacher's exam list / student's exam list. */
export interface ExamSummary {
  id: string
  title: string
  description: string | null
  type: 'EXAM' | 'ASSIGNMENT'
  durationMins: number
  totalPoints: number
  passingPct: number
  questionCount: number
  dueAt: string | null
  isPublished: boolean
  courseId: string | null
  courseTitle: string | null
  createdAt: string
  /** Teacher view. */
  submissionCount?: number
  gradedCount?: number
  flaggedCount?: number
  /** Student view — their own attempt, if any. */
  attempt?: StudentAttemptState | null
}

export interface StudentAttemptState {
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED'
  startedAt: string
  submittedAt: string | null
  score: number | null
  maxScore: number
  tabSwitches: number
}

/** The locked-down paper a student receives — no answer key. */
export interface ExamDetail {
  id: string
  title: string
  description: string | null
  type: 'EXAM' | 'ASSIGNMENT'
  durationMins: number
  totalPoints: number
  passingPct: number
  dueAt: string | null
  courseTitle: string | null
  teacherName: string | null
  config: ExamAntiCheatConfig
  questions: SafeQuestion[]
  attempt: StudentAttemptState | null
  /** Server-authoritative; null until the attempt starts. */
  deadline: string | null
}

/** Row in the teacher's grading table. */
export interface SubmissionRow {
  id: string
  examId: string
  examTitle: string
  courseTitle: string | null
  studentId: string
  studentName: string
  studentEmail: string
  avatarUrl: string | null
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED'
  submittedAt: string | null
  gradedAt: string | null
  autoScore: number
  score: number | null
  maxScore: number
  passingPct: number
  tabSwitches: number
  maxTabSwitches: number
  isFlagged: boolean
  violations: ViolationEvent[]
  feedback: string | null
  /** Questions with the key attached — teacher-only. */
  questions: ExamQuestion[]
  answers: StudentAnswer[]
  pendingManualCount: number
}

/** Row in the student's gradebook. */
export interface GradebookRow {
  submissionId: string
  examId: string
  examTitle: string
  type: 'EXAM' | 'ASSIGNMENT'
  courseTitle: string | null
  teacherName: string | null
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED'
  submittedAt: string | null
  gradedAt: string | null
  score: number | null
  maxScore: number
  passingPct: number
  feedback: string | null
  /** Released papers only — the student sees their own marked answers. */
  answers: StudentAnswer[]
  questions: SafeQuestion[]
}

export interface GradebookSummary {
  averagePct: number
  letter: string
  totalTaken: number
  gradedCount: number
  pendingCount: number
  passedCount: number
  failedCount: number
}

export const STATUS_LABEL: Record<'IN_PROGRESS' | 'SUBMITTED' | 'GRADED', string> = {
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Awaiting Review',
  GRADED: 'Graded',
}

export const STATUS_STYLE: Record<'IN_PROGRESS' | 'SUBMITTED' | 'GRADED', string> = {
  IN_PROGRESS: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  SUBMITTED: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  GRADED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
}

/** Local-time `"Aug 1, 09:04 AM"`. Em dash for null. */
export function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
