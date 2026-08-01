export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type TeacherStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type NotificationType = 'NEW_POST' | 'LIVE_CLASS_STARTING' | 'ASSIGNMENT_DUE' | 'GRADE_RELEASED' | 'ACCOUNT_APPROVED';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: Role;
  teacherStatus?: TeacherStatus;
  avatarUrl?: string;
  bio?: string;
}

export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls: string[];
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
}

export interface LiveRoom {
  id: string;
  title: string;
  teacherId: string;
  isLive: boolean;
  scheduledAt: string;
}

export interface Attendance {
  id: string;
  roomId: string;
  studentId: string;
  joinedAt: string;
  leftAt?: string;
  durationSec: number;
}

export interface Exam {
  id: string;
  title: string;
  durationMins: number;
  questions: any; // Using any for Json
}

export interface Submission {
  id: string;
  examId: string;
  studentId: string;
  score: number;
  feedback?: string;
  tabSwitches: number;
}
