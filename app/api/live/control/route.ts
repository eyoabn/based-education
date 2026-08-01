import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { RoomServiceClient } from 'livekit-server-sdk';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session || session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden. Only teachers can perform moderation.' }, { status: 403 });
    }

    const { room, action, identity } = await request.json();
    if (!room || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
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
        await roomService.removeParticipant(room, identity);
        break;
      
      case 'MUTE_PARTICIPANT':
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        // Mute the audio track. To do this precisely, we'd need the trackSid.
        // For simplicity, we just trigger mute on all audio tracks of the participant.
        const participant = await roomService.getParticipant(room, identity);
        const audioTracks = participant.tracks.filter(t => t.type === 0); // 0 = AUDIO
        for (const track of audioTracks) {
          await roomService.mutePublishedTrack(room, identity, track.sid, true);
        }
        break;

      case 'MUTE_ALL':
        const participants = await roomService.listParticipants(room);
        for (const p of participants) {
          if (p.identity !== session.userId) {
            const aTracks = p.tracks.filter(t => t.type === 0);
            for (const track of aTracks) {
              await roomService.mutePublishedTrack(room, p.identity, track.sid, true);
            }
          }
        }
        break;

      case 'SHUTDOWN_ROOM':
        await roomService.deleteRoom(room);
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
