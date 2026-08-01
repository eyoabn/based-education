import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// In a real production environment, you'd use Redis Pub/Sub, a message queue, 
// or a dedicated real-time service (Pusher, Socket.io, Supabase Realtime).
// This is a simple in-memory mock for Phase 2 demonstration.
const clients = new Set<{ userId: string, controller: ReadableStreamDefaultController }>();

// Simple function to push events to a specific user
export function notifyUser(userId: string, data: any) {
  clients.forEach(client => {
    if (client.userId === userId) {
      client.controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
    }
  });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 });
  
  const session = await verifyToken(token);
  if (!session) return new NextResponse('Unauthorized', { status: 401 });

  const stream = new ReadableStream({
    start(controller) {
      const client = { userId: session.userId, controller };
      clients.add(client);
      
      // Keep-alive heartbeat every 15s to prevent timeouts
      const interval = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clients.delete(client);
        controller.close();
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
