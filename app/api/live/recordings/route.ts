import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// GET: Retrieve recordings for a specific room or course
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const roomParam = searchParams.get('room');

    if (!roomParam) {
      return NextResponse.json({ error: 'Missing room parameter' }, { status: 400 });
    }

    const decodedRoom = decodeURIComponent(roomParam);

    const liveRoom = await prisma.liveRoom.findFirst({
      where: {
        OR: [
          { id: decodedRoom },
          { title: decodedRoom }
        ]
      },
      select: { id: true, title: true }
    });

    const targetRoomId = liveRoom?.id || decodedRoom;

    const recordings = await (prisma as any).liveRecording.findMany({
      where: {
        OR: [
          { roomId: targetRoomId },
          { roomId: decodedRoom }
        ]
      },
      include: {
        recordedBy: {
          select: { id: true, name: true, role: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      recordings: recordings.map((rec: any) => ({
        ...rec,
        fileSizeBytes: rec.fileSizeBytes ? Number(rec.fileSizeBytes) : null,
      }))
    });
  } catch (error) {
    console.error("[GET /api/live/recordings]", error);
    return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
  }
}

// POST: Upload and publish an audio recording
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const roomParam = formData.get('roomId') as string | null;
    const title = (formData.get('title') as string | null) || `Class Recording - ${new Date().toLocaleDateString()}`;
    const durationSec = Number(formData.get('durationSec') || 0);

    if (!audioFile || !roomParam) {
      return NextResponse.json({ error: 'Missing audio file or room ID' }, { status: 400 });
    }

    const decodedRoom = decodeURIComponent(roomParam);

    const liveRoom = await prisma.liveRoom.findFirst({
      where: {
        OR: [
          { id: decodedRoom },
          { title: decodedRoom }
        ]
      }
    });

    // Check if user is instructor, admin, or representative
    const isTeacherOrAdmin = session.role === 'ADMIN' || (session.role === 'TEACHER' && (!liveRoom || liveRoom.teacherId === session.userId));
    if (!isTeacherOrAdmin) {
      return NextResponse.json({ error: 'Only instructors and administrators can publish recordings.' }, { status: 403 });
    }

    const targetRoomId = liveRoom?.id || decodedRoom;

    // Save audio file locally to public/recordings
    const recordingsDir = path.join(process.cwd(), 'public', 'recordings');
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    const fileExt = audioFile.type.includes('mp4') ? 'mp4' : audioFile.type.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = path.join(recordingsDir, fileName);

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    const publicAudioUrl = `/recordings/${fileName}`;

    // Store in PostgreSQL database
    const recording = await (prisma as any).liveRecording.create({
      data: {
        roomId: targetRoomId,
        recordedById: session.userId,
        title,
        audioUrl: publicAudioUrl,
        durationSec,
        fileSizeBytes: BigInt(buffer.length),
        format: audioFile.type || 'audio/webm;codecs=opus',
      },
      include: {
        recordedBy: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      recording: {
        ...recording,
        fileSizeBytes: Number(recording.fileSizeBytes)
      }
    });
  } catch (error) {
    console.error("[POST /api/live/recordings]", error);
    return NextResponse.json({ error: 'Failed to save recording' }, { status: 500 });
  }
}

// DELETE: Delete a recording from storage and database
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get('id');

    if (!recordingId) {
      return NextResponse.json({ error: 'Missing recording id' }, { status: 400 });
    }

    const recording = await (prisma as any).liveRecording.findUnique({
      where: { id: recordingId },
      include: { room: true }
    });

    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    // Permission check: only the teacher who recorded it, the room owner, or an ADMIN can delete
    const isOwner = recording.recordedById === session.userId;
    const isRoomTeacher = recording.room?.teacherId === session.userId;
    const isAdmin = session.role === 'ADMIN';

    if (!isOwner && !isRoomTeacher && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden. You do not have permission to delete this recording.' }, { status: 403 });
    }

    // Delete local file if it resides in /recordings/
    if (recording.audioUrl && recording.audioUrl.startsWith('/recordings/')) {
      const fileName = path.basename(recording.audioUrl);
      const filePath = path.join(process.cwd(), 'public', 'recordings', fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn("Could not delete audio file from disk:", e);
        }
      }
    }

    // Delete from database
    await (prisma as any).liveRecording.delete({
      where: { id: recordingId }
    });

    return NextResponse.json({ success: true, message: 'Recording deleted successfully' });
  } catch (error) {
    console.error("[DELETE /api/live/recordings]", error);
    return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 });
  }
}
