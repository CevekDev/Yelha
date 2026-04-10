import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { isBanned, bannedReason } = await req.json();

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      isBanned: Boolean(isBanned),
      bannedAt: isBanned ? new Date() : null,
      bannedReason: isBanned ? (bannedReason || 'Banni par l\'administrateur') : null,
    },
    select: { id: true, isBanned: true, bannedAt: true, bannedReason: true },
  });

  return NextResponse.json(user);
}
