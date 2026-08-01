"use client"

import { useState } from "react"
import {
  AlertCircle,
  BookOpen,
  Check,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  Paperclip,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"
import CredentialViewerModal from "@/components/admin/CredentialViewerModal"
import {
  avatarFor,
  formatDate,
  formatWhen,
  type TeacherApplication,
} from "@/lib/admin"

interface TeacherApprovalCardProps {
  application: TeacherApplication
  /** Resolves when the decision is persisted; rejects with a message on failure. */
  onDecide: (
    application: TeacherApplication,
    status: "APPROVED" | "REJECTED",
    reason?: string
  ) => Promise<void>
}

/**
 * One application in the verification queue.
 *
 * Approval is one click; rejection is deliberately two, because it must carry a
 * reason — the applicant is shown that text verbatim, so an empty rejection is
 * not an option the UI offers.
 */
export default function TeacherApprovalCard({
  application,
  onDecide,
}: TeacherApprovalCardProps) {
  const [viewerOpen, setViewerOpen] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState<"APPROVE" | "REJECT" | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pending = application.teacherStatus === "PENDING"
  const docs = application.credentials

  async function decide(status: "APPROVED" | "REJECTED", text?: string) {
    setBusy(status === "APPROVED" ? "APPROVE" : "REJECT")
    setError(null)
    try {
      await onDecide(application, status, text)
      setRejecting(false)
      setReason("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <article className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
              <img
                src={avatarFor(application.name, application.avatarUrl)}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-slate-900 truncate">{application.name}</h3>
                {application.specialty && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200 text-[11px] font-semibold">
                    <GraduationCap className="w-3 h-3" />
                    {application.specialty}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{application.email}</span>
                </span>
                <span className="text-xs text-slate-400">
                  Applied {formatWhen(application.registeredAt)} ·{" "}
                  {formatDate(application.registeredAt)}
                </span>
              </div>

              {application.bio && (
                <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {application.bio}
                </p>
              )}

              {/* Footprint — only meaningful once they have been teaching. */}
              {!pending && (application.courseCount > 0 || application.studentCount > 0) && (
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    {application.courseCount} course{application.courseCount === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {application.studentCount} student
                    {application.studentCount === 1 ? "" : "s"}
                  </span>
                </div>
              )}

              {/* Credentials */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {docs.length === 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200 text-xs font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    No credentials attached
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => setViewerOpen(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Review {docs.length} credential{docs.length === 1 ? "" : "s"}
                    </button>
                    {docs.slice(0, 3).map(doc => (
                      <span
                        key={doc.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-500 max-w-[180px]"
                        title={doc.name}
                      >
                        <Paperclip className="w-3 h-3 shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </span>
                    ))}
                  </>
                )}
              </div>

              {/* Prior ruling */}
              {!pending && (
                <div
                  className={`mt-4 px-3 py-2.5 rounded-lg text-xs ring-1 ring-inset ${
                    application.teacherStatus === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-red-50 text-red-700 ring-red-200"
                  }`}
                >
                  <span className="font-semibold">
                    {application.teacherStatus === "APPROVED" ? "Approved" : "Rejected"}
                  </span>
                  {application.reviewedAt && ` on ${formatDate(application.reviewedAt)}`}
                  {application.reviewedByName && ` by ${application.reviewedByName}`}
                  {application.rejectionReason && (
                    <span className="block mt-1 font-normal">
                      Reason: {application.rejectionReason}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Decision bar */}
        {pending && !rejecting && (
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Approving grants class hosting and assessment publishing.
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setRejecting(true)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Reject Application
              </button>
              <button
                onClick={() => void decide("APPROVED")}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-60"
              >
                {busy === "APPROVE" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Approve Account
              </button>
            </div>
          </div>
        )}

        {/* Rejection reason — required, and shown to the applicant verbatim */}
        {pending && rejecting && (
          <div className="px-5 py-4 bg-red-50/60 border-t border-red-100">
            <label
              htmlFor={`reason-${application.id}`}
              className="block text-xs font-bold uppercase tracking-wide text-red-800 mb-2"
            >
              Why is this application being rejected?
            </label>
            <textarea
              id={`reason-${application.id}`}
              value={reason}
              onChange={event => setReason(event.target.value)}
              rows={3}
              autoFocus
              placeholder="e.g. The uploaded certificate could not be verified against the issuing institution."
              className="w-full px-3 py-2 rounded-lg border border-red-200 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <p className="text-[11px] text-red-700/80 mt-1.5">
              {application.name.split(" ")[0]} receives this text in their notification and email.
            </p>

            <div className="flex items-center justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setRejecting(false)
                  setReason("")
                  setError(null)
                }}
                disabled={busy !== null}
                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void decide("REJECTED", reason.trim())}
                disabled={busy !== null || reason.trim().length < 10}
                title={
                  reason.trim().length < 10 ? "Write at least a sentence of explanation." : undefined
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy === "REJECT" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                Confirm Rejection
              </button>
            </div>
          </div>
        )}
      </article>

      {viewerOpen && (
        <CredentialViewerModal
          applicantName={application.name}
          documents={docs}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  )
}
