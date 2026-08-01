import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { AccessToken } from 'livekit-server-sdk';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const room = searchParams.get('room');

    if (!room) {
      return NextResponse.json({ error: 'Missing room parameter' }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    // Fallback Mock Token if env vars are missing
    if (!apiKey || !apiSecret) {
      console.warn("LiveKit API Keys not found. Returning a mock token for UI testing.");
      return NextResponse.json({ 
        token: "mock-token-for-ui-testing",
        isMock: true
      });
    }

    const isTeacher = session.role === 'TEACHER';
    
    const at = new AccessToken(apiKey, apiSecret, {
      identity: session.userId,
      name: session.name,
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      roomAdmin: isTeacher,
      roomCreate: isTeacher,
    });

    return NextResponse.json({ token: await at.toJwt() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
