import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

type SseClient = { userId: string; controller: ReadableStreamDefaultController };

declare global {
  var __sseClients: Set<SseClient> | undefined;
}

const clients: Set<SseClient> = globalThis.__sseClients || new Set();
globalThis.__sseClients = clients;

// Simple function to push events to a specific user
export function notifyUser(userId: string, data: any) {
  const encoder = new TextEncoder();
  const payload = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
  const deadClients: Array<{ userId: string; controller: ReadableStreamDefaultController }> = [];

  clients.forEach(client => {
    if (client.userId === userId) {
      try {
        client.controller.enqueue(payload);
      } catch {
        deadClients.push(client);
      }
    }
  });

  for (const dead of deadClients) {
    clients.delete(dead);
  }
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
      
      const encoder = new TextEncoder();
      const heartbeat = encoder.encode(': heartbeat\n\n');

      // Keep-alive heartbeat every 15s to prevent timeouts
      const interval = setInterval(() => {
        try {
          controller.enqueue(heartbeat);
        } catch {
          clearInterval(interval);
          clients.delete(client);
        }
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clients.delete(client);
        try {
          controller.close();
        } catch {
          // Already closed
        }
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
