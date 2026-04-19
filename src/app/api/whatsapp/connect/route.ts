import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// SSE proxy to the WhatsApp microservice
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');
  if (!connectionId) return new Response('Missing connectionId', { status: 400 });

  const connection = await prisma.connection.findFirst({
    where: { id: connectionId, userId: session.user.id, platform: 'WHATSAPP' },
  });
  if (!connection) return new Response('Not found', { status: 404 });

  const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL;
  const WA_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;

  if (!WA_SERVICE_URL || !WA_SERVICE_SECRET) {
    return new Response('WhatsApp service not configured', { status: 503 });
  }

  // Proxy SSE stream from the WhatsApp microservice
  const upstreamRes = await fetch(
    `${WA_SERVICE_URL}/connect?connectionId=${connectionId}&userId=${session.user.id}`,
    {
      headers: {
        'x-whatsapp-secret': WA_SERVICE_SECRET,
        'Accept': 'text/event-stream',
      },
    }
  ).catch(() => null);

  if (!upstreamRes?.ok || !upstreamRes.body) {
    return new Response('WhatsApp service unavailable', { status: 503 });
  }

  return new Response(upstreamRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
