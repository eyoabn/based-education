"use client"

import { useState, useRef } from "react"
import {
  Camera,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react"

export interface UserProfileData {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  bio?: string | null
  specialty?: string | null
}

interface ProfileSettingsModalProps {
  user: UserProfileData
  isOpen: boolean
  onClose: () => void
  onSaved: (updatedUser: UserProfileData) => void
}

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=256&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80",
]

export default function ProfileSettingsModal({
  user,
  isOpen,
  onClose,
  onSaved,
}: ProfileSettingsModalProps) {
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "")
  const [name, setName] = useState(user.name ?? "")
  const [bio, setBio] = useState(user.bio ?? "")
  const [specialty, setSpecialty] = useState(user.specialty ?? "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WebP).")
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("Image size must be smaller than 3MB.")
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      if (result) {
        setAvatarUrl(result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl: avatarUrl.trim() || null,
          name: name.trim() || user.name,
          bio: bio.trim() || null,
          specialty: specialty.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to save profile changes.")
        return
      }

      setSuccess(true)
      const updated = data.user as UserProfileData
      onSaved(updated)

      // Broadcast event so ChatWindow, Header, and Feed components instantly refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("user-profile-updated", { detail: updated }))
      }

      setTimeout(() => {
        onClose()
      }, 700)
    } catch {
      setError("Network error while saving profile.")
    } finally {
      setSaving(false)
    }
  }

  const initials = (name || user.name || "U")
    .split(" ")
    .map(p => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        className="relative w-full max-w-lg bg-[#111110] text-[#f7f3e8] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-white/[0.08] overflow-hidden animate-fade-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0a0a09]">
          <div>
            <h2 id="profile-settings-title" className="text-base font-bold text-[#f7f3e8]">
              Profile &amp; Avatar Settings
            </h2>
            <p className="text-xs text-[#9d9b95] mt-0.5">
              Personalize your photo and educator profile across messages and feeds
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-[#181817] rounded-xl border border-white/[0.08]">
            <div className="relative group shrink-0">
              <div className="w-20 h-20 rounded-full border-2 border-[rgba(212,175,55,0.4)] shadow-[0_0_15px_rgba(212,175,55,0.2)] overflow-hidden bg-[#242422] flex items-center justify-center text-[#d4af37] text-xl font-bold">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Change Photo"
              >
                <Camera className="w-5 h-5 text-[#d4af37]" />
              </button>
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <h3 className="text-sm font-bold text-[#f7f3e8]">Profile Picture</h3>
              <p className="text-xs text-[#9d9b95] leading-relaxed">
                Upload your picture or select a professional educator avatar. This will appear when you send messages and publish announcements.
              </p>

              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(212,175,55,0.15)] hover:bg-[rgba(212,175,55,0.25)] text-[#f7f3e8] border border-[rgba(212,175,55,0.3)] text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
                  Upload Image
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.08] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-[#9d9b95] text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Preset Avatars */}
          <div>
            <label className="block text-xs font-semibold text-[#f7f3e8] mb-2">
              Or Choose a Curated Professional Portrait:
            </label>
            <div className="flex items-center gap-3 overflow-x-auto py-1">
              {PRESET_AVATARS.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 shrink-0 transition-transform hover:scale-105 ${
                    avatarUrl === url
                      ? "border-[#d4af37] ring-2 ring-[rgba(212,175,55,0.3)] scale-105"
                      : "border-white/[0.1] hover:border-white/[0.3]"
                  }`}
                >
                  <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom URL Input */}
          <div>
            <label htmlFor="avatar-url-input" className="block text-xs font-semibold text-[#f7f3e8] mb-1.5">
              Image URL (optional)
            </label>
            <div className="relative">
              <input
                id="avatar-url-input"
                type="url"
                value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/your-profile-photo.jpg"
                className="w-full px-3.5 py-2 pl-9 bg-[#181817] border border-white/[0.08] rounded-lg text-xs text-[#f7f3e8] placeholder-[#6d6b65] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-shadow"
              />
              <ImageIcon className="w-4 h-4 text-[#9d9b95] absolute left-3 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* User Information */}
          <div className="space-y-3 pt-2 border-t border-white/[0.08]">
            <div>
              <label htmlFor="profile-name" className="block text-xs font-semibold text-[#f7f3e8] mb-1.5">
                Display Name <span className="text-red-400">*</span>
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#181817] border border-white/[0.08] rounded-lg text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="profile-specialty" className="block text-xs font-semibold text-[#f7f3e8] mb-1.5">
                Title / Specialty (e.g. Lead Mathematics Educator)
              </label>
              <input
                id="profile-specialty"
                type="text"
                value={specialty}
                onChange={e => setSpecialty(e.target.value)}
                placeholder="e.g. Department Head, Physics & Engineering"
                className="w-full px-3.5 py-2 bg-[#181817] border border-white/[0.08] rounded-lg text-sm text-[#f7f3e8] placeholder-[#6d6b65] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="profile-bio" className="block text-xs font-semibold text-[#f7f3e8] mb-1.5">
                Short Bio / Introduction
              </label>
              <textarea
                id="profile-bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={2}
                placeholder="Share your teaching philosophy, research focus, or office hours..."
                className="w-full px-3.5 py-2 bg-[#181817] border border-white/[0.08] rounded-lg text-sm text-[#f7f3e8] placeholder-[#6d6b65] resize-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-shadow"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs font-medium text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Profile updated successfully!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-white/[0.08] bg-[#0a0a09]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:opacity-95 disabled:opacity-60 text-black text-xs font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] active:scale-95"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-black" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
