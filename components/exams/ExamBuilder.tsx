"use client"

import { useRef } from "react"
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  FileText,
  ListChecks,
  Plus,
  ToggleLeft,
  Trash2,
  X,
} from "lucide-react"
import {
  QUESTION_TYPE_LABEL,
  totalPointsOf,
  trueFalseOptions,
  type ExamQuestion,
  type QuestionType,
} from "@/lib/exams"

/**
 * Phase 5 — the question builder.
 *
 * A controlled editor: it owns no state beyond an id counter, so the parent
 * form holds one source of truth for the paper and can submit it directly.
 */interface ExamBuilderProps {
  questions: ExamQuestion[]
  onChange: (questions: ExamQuestion[]) => void
  assessmentType?: "EXAM" | "ASSIGNMENT"
}

const TYPE_META: Record<QuestionType, { icon: typeof ListChecks; tone: string }> = {
  MCQ: { icon: ListChecks, tone: "bg-[rgba(212,175,55,0.12)] text-[#f5d77f] border border-[rgba(212,175,55,0.25)]" },
  TRUE_FALSE: { icon: ToggleLeft, tone: "bg-violet-500/15 text-violet-300 border border-violet-500/25" },
  ESSAY: { icon: FileText, tone: "bg-amber-500/15 text-amber-300 border border-amber-500/25" },
}

export default function ExamBuilder({
  questions,
  onChange,
  assessmentType = "EXAM",
}: ExamBuilderProps) {
  // Monotonic so ids stay unique even after deletions reshuffle the list.
  const nextId = useRef(1)
  const makeId = (prefix: string) => `${prefix}${nextId.current++}-${Date.now().toString(36)}`

  const addQuestion = (type: QuestionType) => {
    const base = {
      id: makeId("q"),
      type,
      prompt: "",
      points: 1,
    }

    const question: ExamQuestion =
      type === "ESSAY"
        ? { ...base, options: [], correctOptionId: null }
        : type === "TRUE_FALSE"
          ? { ...base, options: trueFalseOptions(), correctOptionId: "true" }
          : {
              ...base,
              options: [
                { id: makeId("o"), text: "" },
                { id: makeId("o"), text: "" },
              ],
              correctOptionId: null,
            }

    onChange([...questions, question])
  }

  const updateQuestion = (index: number, patch: Partial<ExamQuestion>) => {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index))
  }

  const duplicateQuestion = (index: number) => {
    const source = questions[index]
    // Fresh ids throughout, or the copy's options would collide with the
    // original's and the answer key would follow the wrong question.
    const optionIdMap = new Map(source.options.map(o => [o.id, makeId("o")]))
    const copy: ExamQuestion = {
      ...source,
      id: makeId("q"),
      options: source.options.map(o => ({ id: optionIdMap.get(o.id)!, text: o.text })),
      correctOptionId: source.correctOptionId
        ? (optionIdMap.get(source.correctOptionId) ?? null)
        : null,
    }
    onChange([...questions.slice(0, index + 1), copy, ...questions.slice(index + 1)])
  }

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= questions.length) return
    const next = [...questions]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const addOption = (index: number) => {
    const question = questions[index]
    updateQuestion(index, {
      options: [...question.options, { id: makeId("o"), text: "" }],
    })
  }

  const updateOption = (index: number, optionId: string, text: string) => {
    const question = questions[index]
    updateQuestion(index, {
      options: question.options.map(o => (o.id === optionId ? { ...o, text } : o)),
    })
  }

  const removeOption = (index: number, optionId: string) => {
    const question = questions[index]
    if (question.options.length <= 2) return
    updateQuestion(index, {
      options: question.options.filter(o => o.id !== optionId),
      // Drop the key if it pointed at the option just removed.
      correctOptionId: question.correctOptionId === optionId ? null : question.correctOptionId,
    })
  }

  const total = totalPointsOf(questions)
  const autoGradedCount = questions.filter(q => q.type !== "ESSAY").length

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-[#f7f3e8] uppercase tracking-wider">
            {assessmentType === "ASSIGNMENT" ? "Assignment Tasks & Deliverables" : "Questions"}
          </h3>
          <p className="text-xs text-[#9d9b95] mt-0.5">
            {questions.length} {assessmentType === "ASSIGNMENT" ? "task" : "question"}
            {questions.length === 1 ? "" : "s"} · {total} point
            {total === 1 ? "" : "s"}
            {assessmentType === "EXAM" && ` · ${autoGradedCount} auto-graded`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {assessmentType === "ASSIGNMENT" ? (
            <>
              <button
                type="button"
                onClick={() => addQuestion("ESSAY")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-black font-bold text-xs rounded-xl shadow-lg shadow-[rgba(212,175,55,0.15)] hover:brightness-110 transition-all min-h-[38px]"
              >
                <FileText className="w-3.5 h-3.5" />
                + Task / Written Prompt (Recommended)
              </button>
              <button
                type="button"
                onClick={() => addQuestion("MCQ")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#181817] border border-white/[0.08] hover:border-[rgba(212,175,55,0.35)] text-[#f7f3e8] text-xs font-semibold rounded-xl transition-all min-h-[38px]"
              >
                <ListChecks className="w-3.5 h-3.5 text-[#d4af37]" />
                Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => addQuestion("TRUE_FALSE")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#181817] border border-white/[0.08] hover:border-[rgba(212,175,55,0.35)] text-[#f7f3e8] text-xs font-semibold rounded-xl transition-all min-h-[38px]"
              >
                <ToggleLeft className="w-3.5 h-3.5 text-violet-400" />
                True / False
              </button>
            </>
          ) : (
            (Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map(type => {
              const Icon = TYPE_META[type].icon
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => addQuestion(type)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#181817] border border-white/[0.08] hover:border-[rgba(212,175,55,0.35)] hover:bg-[#20201e] text-[#f7f3e8] text-xs font-semibold rounded-xl transition-all shadow-sm min-h-[38px]"
                >
                  <Icon className="w-3.5 h-3.5 text-[#d4af37]" />
                  {QUESTION_TYPE_LABEL[type]}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Empty state */}
      {questions.length === 0 && (
        <div className="bg-[#111110] rounded-2xl border-2 border-dashed border-white/[0.08] p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center mx-auto mb-3 text-[#d4af37]">
            <ListChecks className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-[#f7f3e8]">
            {assessmentType === "ASSIGNMENT" ? "No assignment tasks yet" : "No questions yet"}
          </p>
          <p className="text-xs text-[#9d9b95] mt-1 max-w-sm mx-auto">
            {assessmentType === "ASSIGNMENT"
              ? "Add a written task, essay prompt, or deliverable requirements for students to complete."
              : "Add a multiple choice, true/false or essay question to begin building the paper."}
          </p>
        </div>
      )}

      {/* Question cards */}
      {questions.map((question, index) => {
        const meta = TYPE_META[question.type]
        const Icon = meta.icon
        const missingKey = question.type !== "ESSAY" && !question.correctOptionId

        return (
          <div
            key={question.id}
            className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg shadow-black/20 overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#181817] border-b border-white/[0.06]">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-black text-xs font-black flex items-center justify-center shrink-0 shadow-sm">
                {index + 1}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.tone}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {QUESTION_TYPE_LABEL[question.type]}
              </span>

              {question.type === "ESSAY" && (
                <span className="text-[11px] text-amber-400 font-semibold hidden sm:inline">
                  Manual review
                </span>
              )}
              {missingKey && (
                <span className="text-[11px] text-red-400 font-semibold">
                  Mark correct answer
                </span>
              )}

              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveQuestion(index, -1)}
                  disabled={index === 0}
                  aria-label="Move question up"
                  className="p-1.5 rounded-lg text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(index, 1)}
                  disabled={index === questions.length - 1}
                  aria-label="Move question down"
                  className="p-1.5 rounded-lg text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => duplicateQuestion(index)}
                  aria-label="Duplicate question"
                  className="p-1.5 rounded-lg text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  aria-label="Delete question"
                  className="p-1.5 rounded-lg text-[#9d9b95] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card body */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label
                    htmlFor={`prompt-${question.id}`}
                    className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
                  >
                    {assessmentType === "ASSIGNMENT"
                      ? "Task Prompt / Instructions"
                      : "Question Prompt"}{" "}
                    <span className="text-[#d4af37]">*</span>
                  </label>
                  <textarea
                    id={`prompt-${question.id}`}
                    value={question.prompt}
                    onChange={e => updateQuestion(index, { prompt: e.target.value })}
                    rows={2}
                    placeholder={
                      assessmentType === "ASSIGNMENT"
                        ? "e.g. Write an essay analyzing the case study findings, citing at least three references..."
                        : "e.g. Which law states that energy cannot be created or destroyed?"
                    }
                    className="w-full px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder-[#9d9b95]/50 resize-none focus:ring-1 focus:ring-[#d4af37]/40 focus:border-[#d4af37] focus:outline-none transition-all"
                  />
                </div>

                <div className="sm:w-28 shrink-0">
                  <label
                    htmlFor={`points-${question.id}`}
                    className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
                  >
                    Points
                  </label>
                  <input
                    id={`points-${question.id}`}
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={question.points}
                    onChange={e =>
                      updateQuestion(index, { points: Number(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm font-bold text-[#f7f3e8] tabular-nums focus:ring-1 focus:ring-[#d4af37]/40 focus:border-[#d4af37] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Options manager */}
              {question.type !== "ESSAY" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[#9d9b95]">
                      Options — select the radio icon to mark the correct answer
                    </span>
                    {question.type === "MCQ" && (
                      <button
                        type="button"
                        onClick={() => addOption(index)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#d4af37] hover:brightness-110 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add option
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {question.options.map(option => {
                      const isCorrect = question.correctOptionId === option.id

                      return (
                        <div
                          key={option.id}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all ${
                            isCorrect
                              ? "bg-[rgba(212,175,55,0.08)] border-[rgba(212,175,55,0.35)] shadow-sm"
                              : "bg-[#181817] border-white/[0.06] hover:border-white/[0.12]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => updateQuestion(index, { correctOptionId: option.id })}
                            aria-label={`Mark "${option.text || "this option"}" as correct`}
                            aria-pressed={isCorrect}
                            className="shrink-0 p-0.5 rounded-full"
                          >
                            {isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-[#d4af37]" />
                            ) : (
                              <Circle className="w-5 h-5 text-white/20 hover:text-[#d4af37] transition-colors" />
                            )}
                          </button>

                          <input
                            type="text"
                            value={option.text}
                            readOnly={question.type === "TRUE_FALSE"}
                            onChange={e => updateOption(index, option.id, e.target.value)}
                            placeholder="Option text"
                            className={`flex-1 bg-transparent border-none text-sm focus:outline-none ${
                              isCorrect ? "text-[#f7f3e8] font-bold" : "text-[#9d9b95]"
                            } ${question.type === "TRUE_FALSE" ? "cursor-default" : ""}`}
                          />

                          {isCorrect && (
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d4af37] bg-[rgba(212,175,55,0.15)] px-2 py-0.5 rounded-md border border-[rgba(212,175,55,0.25)] shrink-0">
                              Correct Key
                            </span>
                          )}

                          {question.type === "MCQ" && question.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(index, option.id)}
                              aria-label="Remove option"
                              className="p-1 rounded-lg text-[#9d9b95] hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {question.type === "ESSAY" && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.2)] rounded-xl text-xs text-[#f5d77f]">
                  <FileText className="w-4 h-4 shrink-0 mt-0.5 text-[#d4af37]" />
                  <span>
                    Students answer in a rich free-text box. This question skips automatic grading and will route directly to your teacher grading suite.
                  </span>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Running total */}
      {questions.length > 0 && (
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#181817] to-[#141413] border border-[rgba(212,175,55,0.3)] rounded-2xl text-[#f7f3e8] shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
            Total Paper Assessment Value
          </span>
          <span className="text-lg font-black text-[#d4af37] tabular-nums">
            {total} point{total === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  )
}
