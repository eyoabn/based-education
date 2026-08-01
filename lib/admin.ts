/**
 * Phase 6 — shared platform-administration model.
 *
 * Imported by the admin API routes (server) and the admin portal (client), so
 * everything here stays free of Node/browser globals and never imports Prisma.
 * The server-only half — the ADMIN guard, audit writer and settings accessor —
 * lives in `lib/adminAuth.ts`.
 *
 * Money rule: every amount in this file is an **integer count of cents**.
 * Floats never touch currency; `formatMoney()` is the only place a decimal
 * point appears.
 */

// --- Identity ---------------------------------------------------------------

export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN'
export type TeacherStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/**
 * The one status the governance table sorts and filters on. It is *derived*,
 * never stored: a ban outranks everything, then an unresolved application,
 * then a rejection. Deriving it in one function keeps the API, the table and
 * the filter dropdown from disagreeing about what "active" means.
 */
export type AccountStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'BANNED'

export function accountStatusOf(user: {
  role: Role
  teacherStatus: TeacherStatus | null
  isBanned: boolean
}): AccountStatus {
  if (user.isBanned) return 'BANNED'
  if (user.role !== 'TEACHER') return 'ACTIVE'
  if (user.teacherStatus === 'PENDING') return 'PENDING'
  if (user.teacherStatus === 'REJECTED') return 'REJECTED'
  return 'ACTIVE'
}

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Student',
  TEACHER: 'Teacher',
  ADMIN: 'Admin',
}

export const ROLE_STYLE: Record<Role, string> = {
  STUDENT: 'bg-sky-50 text-sky-700 ring-sky-200',
  TEACHER: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  ADMIN: 'bg-slate-900 text-white ring-slate-900',
}

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending review',
  REJECTED: 'Rejected',
  BANNED: 'Suspended',
}

export const ACCOUNT_STATUS_STYLE: Record<AccountStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  REJECTED: 'bg-slate-100 text-slate-600 ring-slate-200',
  BANNED: 'bg-red-50 text-red-700 ring-red-200',
}

// --- Teacher verification ---------------------------------------------------

export type CredentialKind = 'PDF' | 'IMAGE' | 'LINK'

/** One uploaded document on a teacher application. */
export interface CredentialDoc {
  id: string
  /** Display name, e.g. "MSc Computer Science — transcript.pdf". */
  name: string
  kind: CredentialKind
  url: string
  /** Size in kilobytes, for the viewer's file chip. Null when unknown. */
  sizeKb: number | null
  uploadedAt: string | null
}

/** Salvage whatever the `User.credentials` JSON column holds. */
export function normalizeCredentials(raw: unknown): CredentialDoc[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((entry, index) => {
    if (!entry || typeof entry !== 'object') return []
    const doc = entry as Record<string, unknown>
    const url = typeof doc.url === 'string' ? doc.url : ''
    if (!url) return []

    const kind: CredentialKind =
      doc.kind === 'PDF' || doc.kind === 'IMAGE' || doc.kind === 'LINK'
        ? doc.kind
        : inferCredentialKind(url)

    const sizeKb = Number(doc.sizeKb)

    return [
      {
        id: typeof doc.id === 'string' && doc.id ? doc.id : `doc-${index}`,
        name: typeof doc.name === 'string' && doc.name ? doc.name : fileNameFrom(url),
        kind,
        url,
        sizeKb: Number.isFinite(sizeKb) && sizeKb > 0 ? Math.round(sizeKb) : null,
        uploadedAt: typeof doc.uploadedAt === 'string' ? doc.uploadedAt : null,
      },
    ]
  })
}

export function inferCredentialKind(url: string): CredentialKind {
  const path = url.split('?')[0].toLowerCase()
  if (path.endsWith('.pdf')) return 'PDF'
  if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(path)) return 'IMAGE'
  return 'LINK'
}

function fileNameFrom(url: string): string {
  const last = url.split('?')[0].split('/').filter(Boolean).pop()
  return last ? decodeURIComponent(last) : 'Attachment'
}

/** A row in the verification queue. */
export interface TeacherApplication {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  bio: string | null
  specialty: string | null
  teacherStatus: TeacherStatus
  credentials: CredentialDoc[]
  rejectionReason: string | null
  registeredAt: string
  reviewedAt: string | null
  reviewedByName: string | null
  /** Context that makes an approved teacher's footprint legible at a glance. */
  courseCount: number
  studentCount: number
}

export interface ApprovalQueueCounts {
  pending: number
  approved: number
  rejected: number
}

export type ApprovalFilter = 'PENDING' | 'APPROVED' | 'REJECTED'

export const APPROVAL_TABS: { id: ApprovalFilter; label: string }[] = [
  { id: 'PENDING', label: 'Pending Review' },
  { id: 'APPROVED', label: 'Approved Teachers' },
  { id: 'REJECTED', label: 'Rejected Applications' },
]

// --- User governance --------------------------------------------------------

export interface AdminUserRow {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  role: Role
  teacherStatus: TeacherStatus | null
  status: AccountStatus
  isBanned: boolean
  banReason: string | null
  bannedAt: string | null
  joinedAt: string
  lastLoginAt: string | null
  /** Posts + submissions + rooms hosted — a cheap "is this account real" cue. */
  activityCount: number
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface AdminUserListResponse {
  users: AdminUserRow[]
  pagination: Pagination
  counts: {
    all: number
    students: number
    teachers: number
    admins: number
    banned: number
    pending: number
  }
}

export type UserSortKey = 'joinedAt' | 'name' | 'lastLoginAt'

export const USER_PAGE_SIZE = 12

/** Every mutation `PATCH /api/admin/users` accepts. */
export type UserAction = 'BAN' | 'UNBAN' | 'CHANGE_ROLE' | 'RESET_PASSWORD'

// --- Platform analytics -----------------------------------------------------

export interface PlatformMetrics {
  totalUsers: number
  studentCount: number
  teacherCount: number
  adminCount: number
  bannedCount: number
  pendingTeachers: number
  approvedTeachers: number
  /** Rooms with `isLive` set right now. */
  activeLiveRooms: number
  scheduledToday: number
  totalCourses: number
  totalExams: number
  totalSubmissions: number
  gradedSubmissions: number
  newUsersThisMonth: number
  /** Cents, current calendar month. */
  revenueCents: number
  commissionCents: number
  revenueChangePct: number
}

/** One column of the revenue chart. Amounts in cents. */
export interface RevenuePoint {
  /** `YYYY-MM`. */
  month: string
  /** Short label for the axis, e.g. "Mar". */
  label: string
  grossCents: number
  commissionCents: number
  payoutCents: number
  paymentCount: number
}

/** One point of a stat-tile sparkline. */
export interface GrowthPoint {
  month: string
  label: string
  users: number
}

export type AuditAction =
  | 'TEACHER_APPROVED'
  | 'TEACHER_REJECTED'
  | 'USER_BANNED'
  | 'USER_REINSTATED'
  | 'USER_ROLE_CHANGED'
  | 'PASSWORD_RESET_ISSUED'
  | 'BROADCAST_SENT'
  | 'MAINTENANCE_TOGGLED'
  | 'PLAN_UPDATED'

export interface AuditEntry {
  id: string
  action: AuditAction
  summary: string
  adminName: string
  targetName: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export const AUDIT_LABEL: Record<AuditAction, string> = {
  TEACHER_APPROVED: 'Teacher approved',
  TEACHER_REJECTED: 'Application rejected',
  USER_BANNED: 'Account suspended',
  USER_REINSTATED: 'Account reinstated',
  USER_ROLE_CHANGED: 'Role changed',
  PASSWORD_RESET_ISSUED: 'Reset link issued',
  BROADCAST_SENT: 'Broadcast sent',
  MAINTENANCE_TOGGLED: 'Maintenance toggled',
  PLAN_UPDATED: 'Plan updated',
}

/**
 * Audit rows are dots in a timeline, so tone is doing semantic work here:
 * green = something was granted, red = something was taken away, slate =
 * housekeeping.
 */
export const AUDIT_STYLE: Record<AuditAction, string> = {
  TEACHER_APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  TEACHER_REJECTED: 'bg-red-50 text-red-700 ring-red-200',
  USER_BANNED: 'bg-red-50 text-red-700 ring-red-200',
  USER_REINSTATED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  USER_ROLE_CHANGED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  PASSWORD_RESET_ISSUED: 'bg-sky-50 text-sky-700 ring-sky-200',
  BROADCAST_SENT: 'bg-violet-50 text-violet-700 ring-violet-200',
  MAINTENANCE_TOGGLED: 'bg-amber-50 text-amber-700 ring-amber-200',
  PLAN_UPDATED: 'bg-slate-100 text-slate-700 ring-slate-200',
}

/** Leaderboard row — ranked by reach, which is what the platform can measure. */
export interface TopTeacher {
  id: string
  name: string
  avatarUrl: string | null
  specialty: string | null
  studentCount: number
  courseCount: number
  sessionCount: number
}

export interface AnalyticsResponse {
  metrics: PlatformMetrics
  revenue: RevenuePoint[]
  growth: GrowthPoint[]
  auditLog: AuditEntry[]
  topTeachers: TopTeacher[]
  settings: PlatformSettings
}

// --- Platform settings & plans ---------------------------------------------

export interface PlatformSettings {
  maintenanceMode: boolean
  maintenanceNote: string | null
  commissionPct: number
  registrationOpen: boolean
  updatedAt: string | null
}

export type BillingInterval = 'MONTHLY' | 'YEARLY'

export interface PlanRow {
  id: string
  name: string
  slug: string
  audience: Role
  priceCents: number
  interval: BillingInterval
  features: string[]
  isActive: boolean
  sortOrder: number
  /** Live subscriber count — how many users have ever paid for this tier. */
  subscriberCount: number
  /** Lifetime gross from this plan, in cents. */
  grossCents: number
}

export const INTERVAL_LABEL: Record<BillingInterval, string> = {
  MONTHLY: '/mo',
  YEARLY: '/yr',
}

/** The plans a brand-new database is seeded with on first read. */
export const DEFAULT_PLANS: Omit<PlanRow, 'id' | 'subscriberCount' | 'grossCents'>[] = [
  {
    name: 'Starter',
    slug: 'teacher-starter',
    audience: 'TEACHER',
    priceCents: 0,
    interval: 'MONTHLY',
    features: ['Up to 30 students', '2 live classes / week', 'Basic gradebook'],
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'Professional',
    slug: 'teacher-pro',
    audience: 'TEACHER',
    priceCents: 2900,
    interval: 'MONTHLY',
    features: ['Unlimited students', 'Unlimited live classes', 'Anti-cheat exam suite', 'Attendance analytics'],
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Institution',
    slug: 'institution',
    audience: 'ADMIN',
    priceCents: 24900,
    interval: 'MONTHLY',
    features: ['Everything in Professional', 'Multi-teacher workspaces', 'Priority support', 'Custom branding'],
    isActive: true,
    sortOrder: 2,
  },
]

// --- Formatting -------------------------------------------------------------

/** `1_234_500` → `"$12,345.00"`. Whole amounts drop the cents. */
export function formatMoney(cents: number, options: { compact?: boolean } = {}): string {
  const value = (Number.isFinite(cents) ? cents : 0) / 100

  if (options.compact && Math.abs(value) >= 1000) {
    return `$${compactNumber(value)}`
  }

  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

/** `12_900` → `"12.9K"`. Used by stat tiles, never by axis ticks. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${trimZero(value / 1_000_000)}M`
  if (abs >= 1_000) return `${trimZero(value / 1_000)}K`
  return `${Math.round(value)}`
}

function trimZero(value: number): string {
  const fixed = value.toFixed(1)
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed
}

export function formatCount(value: number): string {
  return (Number.isFinite(value) ? value : 0).toLocaleString('en-US')
}

/** Whole percent, guarding the divide-by-zero that an empty platform hands you. */
export function pctOf(part: number, whole: number): number {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

/** Signed month-over-month change, capped so a 0 → 5 jump isn't "+500%". */
export function changePct(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** "3h ago" / "12 Mar" — the format the queue and audit log both want. */
export function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60_000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`

  return formatDate(iso)
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Deterministic placeholder avatar, matching the rest of the app. */
export function avatarFor(seed: string, url?: string | null): string {
  return url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
}

/** The last 12 month buckets, oldest first, as `YYYY-MM` + axis label. */
export function monthBuckets(count = 12, now: Date = new Date()): { month: string; label: string }[] {
  const buckets: { month: string; label: string }[] = []

  for (let offset = count - 1; offset >= 0; offset--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
    buckets.push({
      month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    })
  }

  return buckets
}

/** `YYYY-MM` key for a timestamp, matching `monthBuckets()`. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}
