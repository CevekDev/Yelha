import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [entries, instagramCount, facebookCount] = await Promise.all([
    prisma.waitlistEmail.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.waitlistEmail.count({ where: { platform: 'instagram' } }),
    prisma.waitlistEmail.count({ where: { platform: 'facebook' } }),
  ]);

  return NextResponse.json({ entries, counts: { instagram: instagramCount, facebook: facebookCount } });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  await prisma.waitlistEmail.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
