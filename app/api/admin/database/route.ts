import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Default Supabase / standard tier limit is 500 MB
const DEFAULT_STORAGE_LIMIT_MB = 500;

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const q = (searchParams.get('q') || '').trim();

    // 1. Database Storage & Analytics Overview
    if (type === 'overview' || type === 'storage') {
      let dbSizeBytes = 0;
      let dbSizeFormatted = '0 MB';
      let tableSizes: Array<{
        tableName: string;
        totalBytes: number;
        totalSizeFormatted: string;
        estimatedRowCount: number;
      }> = [];

      try {
        const rawDbSize: any = await prisma.$queryRawUnsafe(`
          SELECT 
            pg_database_size(current_database()) as db_bytes,
            pg_size_pretty(pg_database_size(current_database())) as db_size;
        `);
        if (rawDbSize && rawDbSize[0]) {
          dbSizeBytes = Number(rawDbSize[0].db_bytes || 0);
          dbSizeFormatted = String(rawDbSize[0].db_size || '0 MB');
        }

        const rawTables: any = await prisma.$queryRawUnsafe(`
          SELECT 
            relname as table_name,
            pg_total_relation_size(c.oid) as total_bytes,
            pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
            reltuples::bigint as estimated_row_count
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relkind = 'r'
          ORDER BY pg_total_relation_size(c.oid) DESC;
        `);

        if (Array.isArray(rawTables)) {
          tableSizes = rawTables.map(t => ({
            tableName: String(t.table_name),
            totalBytes: Number(t.total_bytes || 0),
            totalSizeFormatted: String(t.total_size || '0 kB'),
            estimatedRowCount: Math.max(0, Number(t.estimated_row_count || 0)),
          }));
        }
      } catch (err) {
        console.warn('Could not query raw PostgreSQL pg_database_size, calculating fallback:', err);
      }

      // Exact model counts
      const [
        usersCount,
        coursesCount,
        liveRoomsCount,
        examsCount,
        chatMessagesCount,
        attendancesCount,
        postsCount,
        submissionsCount,
        auditLogsCount,
      ] = await Promise.all([
        prisma.user.count().catch(() => 0),
        prisma.course.count().catch(() => 0),
        prisma.liveRoom.count().catch(() => 0),
        prisma.exam.count().catch(() => 0),
        prisma.chatMessage.count().catch(() => 0),
        prisma.attendance.count().catch(() => 0),
        prisma.post.count().catch(() => 0),
        prisma.submission.count().catch(() => 0),
        prisma.auditLog.count().catch(() => 0),
      ]);

      // If dbSizeBytes was 0 (e.g. non-postgres), calculate reasonable estimate
      if (dbSizeBytes === 0) {
        const totalRows = usersCount + coursesCount + liveRoomsCount + examsCount +
          chatMessagesCount + attendancesCount + postsCount + submissionsCount + auditLogsCount;
        dbSizeBytes = Math.max(1024 * 1024 * 4, totalRows * 2048);
        dbSizeFormatted = `${(dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`;
      }

      const totalUsedMB = Number((dbSizeBytes / (1024 * 1024)).toFixed(2));
      const capacityMB = DEFAULT_STORAGE_LIMIT_MB;
      const remainingMB = Math.max(0, Number((capacityMB - totalUsedMB).toFixed(2)));
      const usagePercent = Math.min(100, Number(((totalUsedMB / capacityMB) * 100).toFixed(2)));
      const remainingPercent = Number((100 - usagePercent).toFixed(2));

      return NextResponse.json({
        storage: {
          totalUsedBytes: dbSizeBytes,
          totalUsedFormatted: dbSizeFormatted,
          totalUsedMB,
          capacityMB,
          remainingMB,
          usagePercent,
          remainingPercent,
          tableSizes,
        },
        counts: {
          users: usersCount,
          courses: coursesCount,
          liveRooms: liveRoomsCount,
          exams: examsCount,
          chatMessages: chatMessagesCount,
          attendances: attendancesCount,
          posts: postsCount,
          submissions: submissionsCount,
          auditLogs: auditLogsCount,
        },
      });
    }

    // 2. View Table Records
    if (type === 'users') {
      const where = q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const records = await prisma.user.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBanned: true,
          avatarUrl: true,
          createdAt: true,
          _count: { select: { enrolledIn: true, taughtCourses: true } },
        },
      });

      return NextResponse.json({ records, total: records.length });
    }

    if (type === 'courses') {
      const where = q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { code: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {};

      const records = await prisma.course.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: { select: { name: true, email: true } },
          _count: { select: { students: true, liveRooms: true, assignments: true } },
        },
      });

      return NextResponse.json({ records, total: records.length });
    }

    if (type === 'liveRooms') {
      const where = q ? { title: { contains: q, mode: 'insensitive' as const } } : {};
      const records = await prisma.liveRoom.findMany({
        where,
        take: 100,
        orderBy: { scheduledAt: 'desc' },
        include: {
          teacher: { select: { name: true, email: true } },
          course: { select: { title: true } },
          _count: { select: { attendances: true, recordings: true } },
        },
      });
      return NextResponse.json({ records, total: records.length });
    }

    if (type === 'exams') {
      const where = q ? { title: { contains: q, mode: 'insensitive' as const } } : {};
      const records = await prisma.exam.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          course: { select: { title: true } },
          _count: { select: { submissions: true } },
        },
      });
      return NextResponse.json({ records, total: records.length });
    }

    if (type === 'messages') {
      const where = q ? { content: { contains: q, mode: 'insensitive' as const } } : {};
      const records = await prisma.chatMessage.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { name: true, email: true, role: true } },
          conversation: { select: { id: true, isDirect: true } },
        },
      });
      return NextResponse.json({ records, total: records.length });
    }

    if (type === 'attendances') {
      const records = await prisma.attendance.findMany({
        take: 100,
        orderBy: { joinedAt: 'desc' },
        include: {
          student: { select: { name: true, email: true } },
          room: { select: { title: true, isLive: true } },
        },
      });
      return NextResponse.json({ records, total: records.length });
    }

    if (type === 'posts') {
      const where = q ? { content: { contains: q, mode: 'insensitive' as const } } : {};
      const records = await prisma.post.findMany({
        where,
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { name: true, email: true } },
          _count: { select: { likes: true, comments: true } },
        },
      });
      return NextResponse.json({ records, total: records.length });
    }

    if (type === 'auditLogs') {
      const records = await prisma.auditLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { name: true, email: true } },
        },
      });
      return NextResponse.json({ records, total: records.length });
    }

    return NextResponse.json({ error: 'Invalid table or report type' }, { status: 400 });
  } catch (error) {
    console.error('[GET /api/admin/database]', error);
    return NextResponse.json({ error: 'Failed to fetch database reports' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) return NextResponse.json({ error: 'ID and type required' }, { status: 400 });

    if (type === 'course') {
      await prisma.course.delete({ where: { id } });
    } else if (type === 'user') {
      await prisma.user.delete({ where: { id } });
    } else if (type === 'liveRoom') {
      await prisma.liveRoom.delete({ where: { id } });
    } else if (type === 'exam') {
      await prisma.exam.delete({ where: { id } });
    } else if (type === 'message') {
      await prisma.chatMessage.delete({ where: { id } });
    } else if (type === 'attendance') {
      await prisma.attendance.delete({ where: { id } });
    } else if (type === 'post') {
      await prisma.post.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Record admin audit log
    await prisma.auditLog.create({
      data: {
        adminId: session.userId,
        action: 'USER_BANNED',
        summary: `Admin deleted ${type} record ID: ${id}`,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/database]', error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
