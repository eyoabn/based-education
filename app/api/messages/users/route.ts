import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let users: any[] = [];

    if (session.role === 'TEACHER') {
      // Find all students enrolled in any course taught by this teacher
      const taughtCourses = await prisma.course.findMany({
        where: { teacherId: session.userId },
        include: {
          students: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      const studentMap = new Map<string, any>();
      for (const course of taughtCourses) {
        for (const student of course.students) {
          if (!studentMap.has(student.id)) {
            studentMap.set(student.id, {
              ...student,
              courseTitle: course.title,
            });
          }
        }
      }
      users = Array.from(studentMap.values());
    } else if (session.role === 'STUDENT') {
      // Find instructors of courses student is enrolled in, plus classmates
      const enrolledCourses = await prisma.course.findMany({
        where: { students: { some: { id: session.userId } } },
        include: {
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
              specialty: true,
            },
          },
          students: {
            where: { id: { not: session.userId } },
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      const userMap = new Map<string, any>();

      for (const course of enrolledCourses) {
        // Add teacher
        if (course.teacher && !userMap.has(course.teacher.id)) {
          userMap.set(course.teacher.id, {
            ...course.teacher,
            label: `Instructor (${course.title})`,
            isTeacher: true,
          });
        }
        // Add classmates
        for (const peer of course.students) {
          if (!userMap.has(peer.id)) {
            userMap.set(peer.id, {
              ...peer,
              label: `Classmate (${course.title})`,
              isTeacher: false,
            });
          }
        }
      }

      // If student has no courses, also allow chatting with any approved teacher
      if (userMap.size === 0) {
        const teachers = await prisma.user.findMany({
          where: { role: 'TEACHER', teacherStatus: 'APPROVED' },
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
            specialty: true,
          },
          take: 10,
        });
        for (const t of teachers) {
          userMap.set(t.id, {
            ...t,
            label: t.specialty ? `Instructor (${t.specialty})` : 'Instructor',
            isTeacher: true,
          });
        }
      }

      users = Array.from(userMap.values());
    } else {
      // Admin
      users = await prisma.user.findMany({
        where: { id: { not: session.userId } },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
        },
        take: 30,
      });
    }

    return NextResponse.json({ users });
  } catch (error) {
    console.error('[GET /api/messages/users]', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}
