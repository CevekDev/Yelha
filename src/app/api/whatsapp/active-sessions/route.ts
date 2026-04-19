import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Returns active WhatsApp sessions for startup reconnection
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-whatsapp-secret');
  if (!secret || secret !== process.env.WHATSAPP_SERVICE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await prisma.whatsAppSession.findMany({
    where: { isActive: true },
    select: { userId: true, connectionId: true },
  });

  return NextResponse.json({ sessions });
}
