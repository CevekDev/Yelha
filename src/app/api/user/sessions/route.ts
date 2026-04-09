import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id, expires: { gt: new Date() } },
    orderBy: { lastActivity: 'desc' },
    select: { id: true, userAgent: true, ipAddress: true, createdAt: true, lastActivity: true },
  });
  return NextResponse.json(sessions);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 });

  await prisma.session.deleteMany({ where: { id: sessionId, userId: session.user.id } });
  return NextResponse.json({ success: true });
}
