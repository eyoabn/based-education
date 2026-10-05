import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { RoomServiceClient } from 'livekit-server-sdk';
import { invalidateLiveStatusCache } from '../status/route';
import { setRoomMediaState, clearRoomMediaState } from '@/lib/liveMediaState';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { room, action, identity, chatDisabled, isLocked } = body;
    if (!room || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const decodedRoom = decodeURIComponent(room);

    const dbLiveRoom = await prisma.liveRoom.findFirst({
      where: {
        OR: [
          { id: decodedRoom },
          { title: decodedRoom }
        ]
      },
      orderBy: [
        { isLive: 'desc' },
        { createdAt: 'desc' }
      ]
    }).catch(() => null);

    const targetRoom = dbLiveRoom?.id || decodedRoom;

    // Verify moderator privileges: Room Instructor, Admin, or Room Representative (Co-Host)
    const isOwnerOrAdmin = session.role === 'ADMIN' || (session.role === 'TEACHER' && (!dbLiveRoom || dbLiveRoom.teacherId === session.userId));
    let isRepresentative = false;

    if (!isOwnerOrAdmin && !isRepresentative) {
      return NextResponse.json({ error: 'Forbidden. Only instructors and co-hosts can perform moderation.' }, { status: 403 });
    }

    const rawUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL;
    const apiUrl = rawUrl ? rawUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:') : undefined;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiUrl || !apiKey || !apiSecret) {
      console.warn("LiveKit Env Vars missing. Mocking room control action:", action);
      return NextResponse.json({ success: true, mocked: true });
    }

    const roomService = new RoomServiceClient(apiUrl, apiKey, apiSecret);

    if (!isOwnerOrAdmin && dbLiveRoom && dbLiveRoom.isLive) {
      try {
        const rObj = await roomService.listRooms([targetRoom]).then(res => res[0]).catch(() => null);
        if (rObj?.metadata) {
          const meta = JSON.parse(rObj.metadata);
          isRepresentative = Array.isArray(meta.representatives) && meta.representatives.includes(session.userId);
        }
      } catch (e) {}
    }

    if (action === 'SHUTDOWN_ROOM' || action === 'TEACHER_LEFT') {
      if (!isOwnerOrAdmin) {
        return NextResponse.json({ error: 'Forbidden. Only the instructor or administrator can end the live session.' }, { status: 403 });
      }

      // Mark database LiveRoom as no longer live
      await prisma.liveRoom.updateMany({
        where: {
          OR: [
            { id: decodedRoom },
            { title: decodedRoom },
            ...(dbLiveRoom ? [{ id: dbLiveRoom.id }] : [])
          ]
        },
        data: {
          isLive: false,
          endedAt: new Date(),
        }
      }).catch(() => {});

      invalidateLiveStatusCache(decodedRoom);
      if (dbLiveRoom) invalidateLiveStatusCache(dbLiveRoom.id);
    }

    const encoder = new TextEncoder();

    // Helper to send data with fallback to decodedRoom
    const sendRoomData = async (payload: any, topic = 'participant-moderation') => {
      const data = encoder.encode(JSON.stringify(payload));
      try {
        await roomService.sendData(targetRoom, data, 0, { topic });
      } catch (err) {
        // Fallback or retry
      }
      if (targetRoom !== decodedRoom) {
        try {
          await roomService.sendData(decodedRoom, data, 0, { topic });
        } catch {}
      }
    };

    switch (action) {
      case 'KICK_PARTICIPANT': {
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        // 1. Broadcast kick message to participant over WebRTC data channel
        await sendRoomData({ action: 'KICK', identity });
        // 2. Remove participant via LiveKit server SDK
        try {
          await roomService.removeParticipant(targetRoom, identity);
        } catch {
          if (targetRoom !== decodedRoom) {
            await roomService.removeParticipant(decodedRoom, identity).catch(() => {});
          }
        }
        break;
      }

      case 'BAN_PARTICIPANT': {
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        // 1. Add to room metadata banned list
        try {
          const rObj = await roomService.listRooms([targetRoom]).then(res => res[0]).catch(() => null);
          let currentMeta: any = {};
          try { currentMeta = JSON.parse(rObj?.metadata || '{}'); } catch {}
          const banned: string[] = Array.isArray(currentMeta.banned) ? currentMeta.banned : [];
          if (!banned.includes(identity)) {
            banned.push(identity);
            await roomService.updateRoomMetadata(targetRoom, JSON.stringify({ ...currentMeta, banned })).catch(() => {
              if (targetRoom !== decodedRoom) {
                return roomService.updateRoomMetadata(decodedRoom, JSON.stringify({ ...currentMeta, banned })).catch(() => {});
              }
            });
          }
        } catch (e) {
          console.warn("Error updating banned list in metadata:", e);
        }

        // 2. Broadcast ban message to participant over WebRTC
        await sendRoomData({ action: 'BAN', identity });

        // 3. Remove participant from LiveKit room
        try {
          await roomService.removeParticipant(targetRoom, identity);
        } catch {
          if (targetRoom !== decodedRoom) {
            await roomService.removeParticipant(decodedRoom, identity).catch(() => {});
          }
        }
        break;
      }
      
      case 'MUTE_PARTICIPANT': {
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        try {
          let participant = await roomService.getParticipant(targetRoom, identity).catch(() => null);
          if (!participant && targetRoom !== decodedRoom) {
            participant = await roomService.getParticipant(decodedRoom, identity).catch(() => null);
          }
          if (participant) {
            const audioTracks = participant.tracks.filter(t => t.type === 0); // 0 = AUDIO
            for (const track of audioTracks) {
              await roomService.mutePublishedTrack(targetRoom, identity, track.sid, true).catch(() => {});
            }
          }
        } catch (e) {
          console.warn("Error muting participant audio via SDK:", e);
        }
        // Broadcast mute message so participant's client immediately shuts their microphone
        await sendRoomData({ action: 'MUTE_MIC', identity });
        break;
      }

      case 'SHUT_CAMERA_PARTICIPANT': {
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        try {
          let participant = await roomService.getParticipant(targetRoom, identity).catch(() => null);
          if (!participant && targetRoom !== decodedRoom) {
            participant = await roomService.getParticipant(decodedRoom, identity).catch(() => null);
          }
          if (participant) {
            const videoTracks = participant.tracks.filter(t => t.type === 1); // 1 = VIDEO
            for (const track of videoTracks) {
              await roomService.mutePublishedTrack(targetRoom, identity, track.sid, true).catch(() => {});
            }
          }
        } catch (e) {
          console.warn("Error shutting participant video via SDK:", e);
        }
        // Broadcast shut camera message so participant's client immediately turns off their camera
        await sendRoomData({ action: 'SHUT_CAMERA', identity });
        break;
      }

      case 'MUTE_ALL': {
        try {
          let participants = await roomService.listParticipants(targetRoom).catch(() => []);
          if (participants.length === 0 && targetRoom !== decodedRoom) {
            participants = await roomService.listParticipants(decodedRoom).catch(() => []);
          }
          for (const p of participants) {
            if (p.identity !== session.userId) {
              const aTracks = p.tracks.filter(t => t.type === 0);
              for (const track of aTracks) {
                await roomService.mutePublishedTrack(targetRoom, p.identity, track.sid, true).catch(() => {});
                if (targetRoom !== decodedRoom) {
                  await roomService.mutePublishedTrack(decodedRoom, p.identity, track.sid, true).catch(() => {});
                }
              }
            }
          }
        } catch (err) {
          console.warn("Mute all error:", err);
        }
        await sendRoomData({ action: 'MUTE_ALL' });
        break;
      }

      case 'LOCK_MICS': {
        const locked = typeof isLocked === 'boolean' ? isLocked : true;
        try {
          const roomInfo = await roomService.listRooms([targetRoom]).then(res => res[0]).catch(() => null);
          let metaObj: any = {};
          try { metaObj = JSON.parse(roomInfo?.metadata || '{}'); } catch {}
          const newMeta = JSON.stringify({ ...metaObj, isAudioLocked: locked });
          await roomService.updateRoomMetadata(targetRoom, newMeta).catch(() => {});
          if (targetRoom !== decodedRoom) {
            await roomService.updateRoomMetadata(decodedRoom, newMeta).catch(() => {});
          }
        } catch (err: any) {
          console.warn("Update room metadata error in LOCK_MICS:", err);
        }

        // If locking mics, force mute and restrict publishing permissions for all attendees
        try {
          let participants = await roomService.listParticipants(targetRoom).catch(() => []);
          if (participants.length === 0 && targetRoom !== decodedRoom) {
            participants = await roomService.listParticipants(decodedRoom).catch(() => []);
          }
          for (const p of participants) {
            if (p.identity !== session.userId) {
              if (locked) {
                // Force mute published audio tracks
                const aTracks = p.tracks.filter(t => t.type === 0);
                for (const track of aTracks) {
                  await roomService.mutePublishedTrack(targetRoom, p.identity, track.sid, true).catch(() => {});
                  if (targetRoom !== decodedRoom) {
                    await roomService.mutePublishedTrack(decodedRoom, p.identity, track.sid, true).catch(() => {});
                  }
                }
                // Sever publishing permission at the server network layer
                await roomService.updateParticipant(targetRoom, p.identity, {
                  permission: { canPublish: false, canPublishData: true, canSubscribe: true }
                }).catch(() => {});
                if (targetRoom !== decodedRoom) {
                  await roomService.updateParticipant(decodedRoom, p.identity, {
                    permission: { canPublish: false, canPublishData: true, canSubscribe: true }
                  }).catch(() => {});
                }
              } else {
                // Unlocked: restore publishing permissions
                await roomService.updateParticipant(targetRoom, p.identity, {
                  permission: { canPublish: true, canPublishData: true, canSubscribe: true }
                }).catch(() => {});
                if (targetRoom !== decodedRoom) {
                  await roomService.updateParticipant(decodedRoom, p.identity, {
                    permission: { canPublish: true, canPublishData: true, canSubscribe: true }
                  }).catch(() => {});
                }
              }
            }
          }
        } catch (err) {
          console.warn("Mute/Permission update error in LOCK_MICS:", err);
        }

        await sendRoomData({ action: 'LOCK_MICS', isLocked: locked });
        break;
      }

      case 'ALLOW_MIC': {
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        // Restore publishing permission for this specific student
        try {
          await roomService.updateParticipant(targetRoom, identity, {
            permission: { canPublish: true, canPublishData: true, canSubscribe: true }
          }).catch(() => {});
          if (targetRoom !== decodedRoom) {
            await roomService.updateParticipant(decodedRoom, identity, {
              permission: { canPublish: true, canPublishData: true, canSubscribe: true }
            }).catch(() => {});
          }
        } catch (e) {
          console.warn("Error granting mic permission via SDK:", e);
        }
        await sendRoomData({ action: 'ALLOW_MIC', identity });
        break;
      }

      case 'DISABLE_CAMERAS_ALL': {
        try {
          const allParticipants = await roomService.listParticipants(targetRoom).catch(() => []);
          for (const p of allParticipants) {
            if (p.identity !== session.userId) {
              const vTracks = p.tracks.filter(t => t.type === 1);
              for (const track of vTracks) {
                await roomService.mutePublishedTrack(targetRoom, p.identity, track.sid, true).catch(() => {});
              }
            }
          }
        } catch (err) {
          console.warn("Disable all cameras error:", err);
        }
        await sendRoomData({ action: 'DISABLE_CAMERAS_ALL' });
        break;
      }

      case 'LOWER_HAND': {
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        await sendRoomData({ action: 'LOWER_HAND', identity });
        break;
      }

      case 'TOGGLE_CHAT': {
        try {
          const roomInfo = await roomService.listRooms([targetRoom]).then(res => res[0]).catch(() => null);
          let metaObj = {};
          try { metaObj = JSON.parse(roomInfo?.metadata || '{}'); } catch {}
          await roomService.updateRoomMetadata(targetRoom, JSON.stringify({ ...metaObj, chatDisabled }));
        } catch (err: any) {
          console.warn("Toggle chat error:", err);
        }
        await sendRoomData({ action: 'TOGGLE_CHAT', chatDisabled });
        break;
      }

      case 'TOGGLE_REPRESENTATIVE': {
        if (!identity) return NextResponse.json({ error: 'Missing identity' }, { status: 400 });
        let updatedReps: string[] = [];
        try {
          const roomObj = await roomService.listRooms([targetRoom]).then(res => res[0]).catch(() => null);
          let currentMeta: any = {};
          try { currentMeta = JSON.parse(roomObj?.metadata || '{}'); } catch {}
          const reps: string[] = Array.isArray(currentMeta.representatives) ? currentMeta.representatives : [];
          const isRep = reps.includes(identity);
          updatedReps = isRep ? reps.filter(id => id !== identity) : [...reps, identity];
          await roomService.updateRoomMetadata(targetRoom, JSON.stringify({ ...currentMeta, representatives: updatedReps })).catch(() => {
            if (targetRoom !== decodedRoom) {
              return roomService.updateRoomMetadata(decodedRoom, JSON.stringify({ ...currentMeta, representatives: updatedReps })).catch(() => {});
            }
          });
        } catch (err) {
          console.warn("Toggle representative error:", err);
        }
        await sendRoomData({ action: 'UPDATE_REPRESENTATIVES', representatives: updatedReps, identity });
        break;
      }

      case 'UPDATE_MEDIA': {
        const { mediaState } = body;
        const normalizedMedia = mediaState
          ? {
              ...mediaState,
              startedAt: mediaState.isPlaying ? (mediaState.startedAt || Date.now()) : undefined,
            }
          : null;

        // Cache in memory for instant delivery to latecomers
        setRoomMediaState(decodedRoom, normalizedMedia);
        if (targetRoom && targetRoom !== decodedRoom) {
          setRoomMediaState(targetRoom, normalizedMedia);
        }

        try {
          const rObj = await roomService.listRooms([decodedRoom]).then(res => res[0]).catch(() => null);
          let rMeta: any = {};
          try { rMeta = JSON.parse(rObj?.metadata || '{}'); } catch {}
          await roomService.updateRoomMetadata(decodedRoom, JSON.stringify({ ...rMeta, mediaState: normalizedMedia }));
        } catch (err: any) {
          if (err?.status === 404 || err?.code === 'not_found' || err?.message?.includes('not exist')) {
            console.warn(`[LiveControl] Room ${decodedRoom} does not exist on LiveKit during UPDATE_MEDIA`);
          } else {
            throw err;
          }
        }
        await sendRoomData({ action: 'UPDATE_MEDIA', mediaState: normalizedMedia });
        break;
      }

      case 'SHUTDOWN_ROOM':
      case 'TEACHER_LEFT': {
        clearRoomMediaState(decodedRoom);
        if (targetRoom) clearRoomMediaState(targetRoom);
        try {
          const encoder = new TextEncoder();
          const roomsToClean = Array.from(new Set([targetRoom, decodedRoom].filter(Boolean)));
          for (const r of roomsToClean) {
            await roomService.sendData(
              r,
              encoder.encode(JSON.stringify({ type: 'SESSION_ENDED' })),
              0,
              { topic: 'session-ended' }
            ).catch(() => {});
            await roomService.deleteRoom(r).catch(() => {});
          }
        } catch (e) {
          console.warn("LiveKit shutdown error:", e);
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to perform room control action' }, { status: 500 });
  }
}
