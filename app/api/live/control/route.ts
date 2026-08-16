import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RoomServiceClient } from 'livekit-server-sdk';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden. Only teachers can perform moderation.' }, { status: 403 });
    }

    const body = await request.json();
    const { room, action, identity, chatDisabled } = body;
    if (!room || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const decodedRoom = decodeURIComponent(room);

    if (action === 'SHUTDOWN_ROOM') {
      // Mark database LiveRoom as no longer live
      await prisma.liveRoom.updateMany({
        where: {
          OR: [
            { id: decodedRoom },
            { title: decodedRoom }
          ]
        },
        data: {
          isLive: false,
          endedAt: new Date(),
        }
      }).catch(() => {});
    }

    const apiUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiUrl || !apiKey || !apiSecret) {
      console.warn("LiveKit Env Vars missing. Mocking room control action:", action);
      return NextResponse.json({ success: true, mocked: true });
    }

    const roomService = new RoomServiceClient(apiUrl, apiKey, apiSecret);

    switch (action) {
      case 'KICK_PARTICIPANT':
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        await roomService.removeParticipant(decodedRoom, identity);
        break;
      
      case 'MUTE_PARTICIPANT':
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        const participant = await roomService.getParticipant(decodedRoom, identity);
        const audioTracks = participant.tracks.filter(t => t.type === 0); // 0 = AUDIO
        for (const track of audioTracks) {
          await roomService.mutePublishedTrack(decodedRoom, identity, track.sid, true);
        }
        break;

      case 'MUTE_ALL':
        const participants = await roomService.listParticipants(decodedRoom);
        for (const p of participants) {
          if (p.identity !== session.userId) {
            const aTracks = p.tracks.filter(t => t.type === 0);
            for (const track of aTracks) {
              await roomService.mutePublishedTrack(decodedRoom, p.identity, track.sid, true);
            }
          }
        }
        break;

      case 'DISABLE_CAMERAS_ALL':
        const allParticipants = await roomService.listParticipants(decodedRoom);
        for (const p of allParticipants) {
          if (p.identity !== session.userId) {
            const vTracks = p.tracks.filter(t => t.type === 1); // 1 = VIDEO
            for (const track of vTracks) {
              await roomService.mutePublishedTrack(decodedRoom, p.identity, track.sid, true);
            }
          }
        }
        break;

      case 'TOGGLE_CHAT':
        const roomInfo = await roomService.listRooms([decodedRoom]).then(res => res[0]).catch(() => null);
        let metaObj = {};
        try { metaObj = JSON.parse(roomInfo?.metadata || '{}'); } catch {}
        await roomService.updateRoomMetadata(decodedRoom, JSON.stringify({ ...metaObj, chatDisabled }));
        break;

      case 'TOGGLE_REPRESENTATIVE':
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        const roomObj = await roomService.listRooms([decodedRoom]).then(res => res[0]).catch(() => null);
        let currentMeta: any = {};
        try { currentMeta = JSON.parse(roomObj?.metadata || '{}'); } catch {}
        const reps: string[] = currentMeta.representatives || [];
        const isRep = reps.includes(identity);
        const updatedReps = isRep ? reps.filter(id => id !== identity) : [...reps, identity];
        await roomService.updateRoomMetadata(decodedRoom, JSON.stringify({ ...currentMeta, representatives: updatedReps }));
        break;

      case 'UPDATE_MEDIA':
        const { mediaState } = body;
        const rObj = await roomService.listRooms([decodedRoom]).then(res => res[0]).catch(() => null);
        let rMeta: any = {};
        try { rMeta = JSON.parse(rObj?.metadata || '{}'); } catch {}
        await roomService.updateRoomMetadata(decodedRoom, JSON.stringify({ ...rMeta, mediaState }));
        break;

      case 'SHUTDOWN_ROOM':
        await roomService.deleteRoom(decodedRoom).catch(() => {});
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to perform room control action' }, { status: 500 });
  }
}
