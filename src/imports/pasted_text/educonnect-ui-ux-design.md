Act as a Principal UI/UX Product Designer specialized in modern SaaS and EdTech platforms. Design a world-class, multi-role web application UI/UX for "Educonnect"—an advanced online learning platform featuring live video classrooms, social feeds, secure testing, and role-based workflows.

---

### 🎨 BRAND IDENTITY & DESIGN SYSTEM GUIDELINES
- Aesthetic Vibe: Premium, clean, futuristic yet accessible SaaS. Think Apple precision + Linear.app crispness + Coursera utility.
- Color Palette:
  • Primary Brand: Deep Royal Indigo (#1E1B4B) & Electric Blue/Indigo (#4F46E5)
  • Secondary / Accent: Emerald Green (#10B981) for live status, vibrant Coral/Red (#EF4444) for host actions (Kick/End Stream)
  • Backgrounds: Ultra-clean Light Mode (#F8FAFC) with rich Off-Black Dark Mode (#0F172A) components.
  • Surface Cards: Elevated glassmorphic cards with subtle 1px border (#E2E8F0 or rgba(255,255,255,0.1)).
- Typography: Plus Jakarta Sans or Inter. Crisp hierarchy (Display 32px Bold, H1 24px Semi-Bold, Body 14px Regular, Caption 12px Medium).
- UI Components & Tokens:
  • Rounded corners (12px for cards, 8px for buttons, 24px pill tags).
  • Auto-Layout compliant, responsive grids (12-column web layout).
  • Micro-interactions, subtle drop shadows (0 4px 20px rgba(0,0,0,0.05)), status indicators with pulse animations.

---

### 📱 CORE SCREENS & SPECIFIC LAYOUT REQUIREMENTS

#### SCREEN 1: Email Authentication & Teacher Verification Onboarding
- Split-screen layout: Left side with inspiring EdTech branding graphics; right side with sleek auth form.
- Form Elements: Email, Password, Role Toggle Pill Selector [Student | Teacher].
- Dynamic Field State: When "Teacher" is selected, expand fields for "Teaching Expertise / Resume Attachment".
- "Pending Verification State" Screen for Teachers: A clean status modal informing the teacher that their application is under review by the Super Admin, with a animated step-indicator.

#### SCREEN 2: Teacher Feed & Post Hub (Social Learning Stream)
- Layout: 3-column layout (Left Sidebar Navigation, Center Main Feed, Right Upcoming Live Schedules & Quick Stats).
- Post Creator Widget (Top Center): Rich-text box with options to attach PDFs, slide decks, external links, and target specific classes [Dropdown: Select Class].
- Post Feed Cards: Author avatar with verified badge, timestamp, formatted text body, expandable file attachment previews, comment section with nested student replies, and like/bookmark counters.

#### SCREEN 3: Live Virtual Classroom (Google Meet Alternative with Host Controls)
- Layout: Fullscreen immersive dark theme (#090D16).
- Main Stage: Adaptive WebRTC video grid (Active speaker highlight with bright indigo outline, participant avatar fallbacks for audio-only).
- Host Control Bar (Floating Glassmorphic Panel at Bottom):
  • Mic (Mute/Unmute), Camera (On/Off), Screen Share, Raise Hand.
  • Teacher Moderation Menu: Floating action popup with "Mute All", "Kick Participant", and a prominent Red "End Meeting for All" button.
- Right Sliding Drawer (Tabbed):
  • Tab 1 [Live Chat]: Real-time chat stream with pinned teacher announcements.
  • Tab 2 [Participant List & Attendance]: Live presence list showing total active minutes, raise hand queue, and quick "Remove/Mute" icon actions beside each student name.

#### SCREEN 4: Universal Real-Time Notification Center
- Slide-over Notification Panel / Modal triggered by the top navigation Bell icon.
- Features:
  • Category Filter Pills: [All | Announcements | Live Class Reminders | Submissions | System].
  • Interactive Cards: Highlight unread notifications with blue pulse dots. "Join Live Now" direct action buttons for upcoming class alerts.

#### SCREEN 5: Teacher Dashboard (Schedule, Attendance & Secure Grading)
- Bento-grid dashboard header: Quick stats (Total Active Students, Course Completion Rate, Pending Grading Count).
- Interactive Calendar Component: Visual timetable showing live streams, assignment deadlines, and exam dates.
- Submission & Grading Drawer: Split screen view with student's submitted PDF document on the left and grading inputs (Score out of 100, Audio/Text Feedback) on the right.

#### SCREEN 6: Student Secure Exam Portal
- Distraction-Free Fullscreen View: Top bar locked with active countdown timer, current question index (e.g., Question 14 of 30), and "Submit Exam" button.
- Anti-Cheating Visual Warnings: A subtle header banner stating "Full-Screen Guard Active | Tab-switches are logged".
- Question Interface: Clean radio-button / multi-select options, flag for review toggle, and bottom navigation bar (Previous / Next Question).

#### SCREEN 7: Super Admin Verification & Management Portal
- Metric Cards: Total Users, Pending Teacher Verification Requests, Revenue/Monetization overview.
- Teacher Verification Data Table: Avatar, Name, Email, Uploaded Credentials preview button, and "Approve / Reject" quick-action buttons.

---

### 🎯 OUTPUT EXPECTATIONS
Generate clean, pixel-perfect, auto-layout Figma components with auto-layout constraints, responsive breakpoints, variant states (Default, Hover, Active, Disabled), and a reusable UI Kit design tokens foundation.