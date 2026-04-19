import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { connectionId } = await request.json();
  if (!connectionId) return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });

  const connection = await prisma.connection.findFirst({
    where: { id: connectionId, userId: session.user.id, platform: 'WHATSAPP' },
  });
  if (!connection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL;
  const WA_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;

  if (WA_SERVICE_URL && WA_SERVICE_SECRET) {
    await fetch(`${WA_SERVICE_URL}/disconnect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-whatsapp-secret': WA_SERVICE_SECRET },
      body: JSON.stringify({ connectionId }),
    }).catch(() => {});
  }

  await prisma.whatsAppSession.updateMany({
    where: { connectionId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
