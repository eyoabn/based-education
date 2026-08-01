"use client"

import { useEffect, useState } from "react"
import { Download, ExternalLink, FileText, ImageIcon, Link2, X } from "lucide-react"
import { formatDate, type CredentialDoc } from "@/lib/admin"

interface CredentialViewerModalProps {
  applicantName: string
  documents: CredentialDoc[]
  /** Which document to open on mount. Defaults to the first. */
  initialId?: string | null
  onClose: () => void
}

const KIND_ICON = {
  PDF: FileText,
  IMAGE: ImageIcon,
  LINK: Link2,
} as const

/**
 * Credential viewer.
 *
 * A PDF renders in an iframe and an image renders inline; anything else is
 * offered as an outbound link rather than guessed at. Uploads are user-supplied
 * URLs, so the iframe is sandboxed — a hostile PDF must not be able to script
 * against the admin's session.
 */
export default function CredentialViewerModal({
  applicantName,
  documents,
  initialId,
  onClose,
}: CredentialViewerModalProps) {
  const [activeId, setActiveId] = useState<string | null>(
    initialId ?? documents[0]?.id ?? null
  )

  // Escape closes, matching every other overlay in the app.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const active = documents.find(doc => doc.id === activeId) ?? documents[0] ?? null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-fade-up">
        {/* Header */}
        <div className="h-14 shrink-0 px-5 border-b border-slate-200 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 truncate">Credentials — {applicantName}</h2>
            <p className="text-xs text-slate-500">
              {documents.length} document{documents.length === 1 ? "" : "s"} submitted
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close credential viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Document list */}
          {documents.length > 1 && (
            <aside className="w-60 shrink-0 border-r border-slate-200 bg-slate-50 overflow-y-auto p-2">
              {documents.map(doc => {
                const Icon = KIND_ICON[doc.kind]
                const selected = doc.id === active?.id

                return (
                  <button
                    key={doc.id}
                    onClick={() => setActiveId(doc.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors flex items-start gap-2.5 ${
                      selected ? "bg-white shadow-sm border border-slate-200" : "hover:bg-white/70"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${selected ? "text-indigo-600" : "text-slate-400"}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-700 truncate">
                        {doc.name}
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        {doc.kind}
                        {doc.sizeKb ? ` · ${doc.sizeKb} KB` : ""}
                        {doc.uploadedAt ? ` · ${formatDate(doc.uploadedAt)}` : ""}
                      </span>
                    </span>
                  </button>
                )
              })}
            </aside>
          )}

          {/* Preview */}
          <div className="flex-1 min-w-0 bg-slate-100 flex flex-col">
            {!active ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <FileText className="w-10 h-10 text-slate-300 mb-3" />
                <p className="font-semibold text-slate-700">No credentials uploaded</p>
                <p className="text-sm text-slate-400 mt-1">
                  This applicant submitted their form without attachments.
                </p>
              </div>
            ) : (
              <>
                <div className="h-11 shrink-0 px-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-600 truncate">{active.name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={active.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open
                    </a>
                    <a
                      href={active.url}
                      download
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </a>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto p-4">
                  {active.kind === "PDF" ? (
                    <iframe
                      key={active.id}
                      src={active.url}
                      title={active.name}
                      // Untrusted upload: no scripts, no same-origin access.
                      sandbox=""
                      referrerPolicy="no-referrer"
                      className="w-full h-full min-h-[60vh] bg-white rounded-lg border border-slate-200"
                    />
                  ) : active.kind === "IMAGE" ? (
                    <div className="w-full h-full flex items-start justify-center">
                      <img
                        src={active.url}
                        alt={active.name}
                        referrerPolicy="no-referrer"
                        className="max-w-full rounded-lg border border-slate-200 bg-white shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <Link2 className="w-10 h-10 text-slate-300 mb-3" />
                      <p className="font-semibold text-slate-700">External credential</p>
                      <p className="text-sm text-slate-400 mt-1 mb-4 max-w-sm break-all">
                        {active.url}
                      </p>
                      <a
                        href={active.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open in a new tab
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
