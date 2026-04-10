import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conn = await prisma.connection.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { isSuspended } = await req.json();
  const updated = await prisma.connection.update({
    where: { id: params.id },
    data: { isSuspended: Boolean(isSuspended) },
  });

  return NextResponse.json(updated);
}
