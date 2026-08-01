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
 */

interface ExamBuilderProps {
  questions: ExamQuestion[]
  onChange: (questions: ExamQuestion[]) => void
}

const TYPE_META: Record<QuestionType, { icon: typeof ListChecks; tone: string }> = {
  MCQ: { icon: ListChecks, tone: "bg-indigo-50 text-indigo-700 ring-indigo-600/20" },
  TRUE_FALSE: { icon: ToggleLeft, tone: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  ESSAY: { icon: FileText, tone: "bg-amber-50 text-amber-700 ring-amber-600/20" },
}

export default function ExamBuilder({ questions, onChange }: ExamBuilderProps) {
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
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Questions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {questions.length} question{questions.length === 1 ? "" : "s"} · {total} point
            {total === 1 ? "" : "s"} · {autoGradedCount} auto-graded
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map(type => {
            const Icon = TYPE_META[type].icon
            return (
              <button
                key={type}
                type="button"
                onClick={() => addQuestion(type)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                <Icon className="w-3.5 h-3.5" />
                {QUESTION_TYPE_LABEL[type]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Empty state */}
      {questions.length === 0 && (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
          <ListChecks className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">No questions yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Add a multiple choice, true/false or essay question to begin building the paper.
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
            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Card header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
              <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {index + 1}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${meta.tone}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {QUESTION_TYPE_LABEL[question.type]}
              </span>

              {question.type === "ESSAY" && (
                <span className="text-[11px] text-amber-600 font-semibold hidden sm:inline">
                  Manual review
                </span>
              )}
              {missingKey && (
                <span className="text-[11px] text-red-600 font-semibold">
                  Mark the correct answer
                </span>
              )}

              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveQuestion(index, -1)}
                  disabled={index === 0}
                  aria-label="Move question up"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(index, 1)}
                  disabled={index === questions.length - 1}
                  aria-label="Move question down"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => duplicateQuestion(index)}
                  aria-label="Duplicate question"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  aria-label="Delete question"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card body */}
            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label
                    htmlFor={`prompt-${question.id}`}
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Question Prompt <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id={`prompt-${question.id}`}
                    value={question.prompt}
                    onChange={e => updateQuestion(index, { prompt: e.target.value })}
                    rows={2}
                    placeholder="e.g. Which law states that energy cannot be created or destroyed?"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
                  />
                </div>

                <div className="sm:w-28 shrink-0">
                  <label
                    htmlFor={`points-${question.id}`}
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
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
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold tabular-nums focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
                  />
                </div>
              </div>

              {/* Options manager */}
              {question.type !== "ESSAY" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">
                      Options — click the circle to mark the correct answer
                    </span>
                    {question.type === "MCQ" && (
                      <button
                        type="button"
                        onClick={() => addOption(index)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
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
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors ${
                            isCorrect
                              ? "bg-emerald-50 border-emerald-300"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => updateQuestion(index, { correctOptionId: option.id })}
                            aria-label={`Mark "${option.text || "this option"}" as correct`}
                            aria-pressed={isCorrect}
                            className="shrink-0"
                          >
                            {isCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-400 transition-colors" />
                            )}
                          </button>

                          <input
                            type="text"
                            value={option.text}
                            readOnly={question.type === "TRUE_FALSE"}
                            onChange={e => updateOption(index, option.id, e.target.value)}
                            placeholder="Option text"
                            className={`flex-1 bg-transparent border-none text-sm focus:outline-none ${
                              isCorrect ? "text-emerald-900 font-semibold" : "text-slate-700"
                            } ${question.type === "TRUE_FALSE" ? "cursor-default" : ""}`}
                          />

                          {isCorrect && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 shrink-0">
                              Correct
                            </span>
                          )}

                          {question.type === "MCQ" && question.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(index, option.id)}
                              aria-label="Remove option"
                              className="p-1 rounded text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
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
                <div className="flex items-start gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                  Students answer in a free-text box. This question skips the auto-grader and
                  waits for you in the Grading suite.
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Running total */}
      {questions.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 rounded-xl text-white">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total Paper Value
          </span>
          <span className="text-lg font-bold tabular-nums">
            {total} point{total === 1 ? "" : "s"}
          </span>
        </div>
      )}
    </div>
  )
}
