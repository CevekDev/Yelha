import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await prisma.systemSetting.findMany();
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { key, value } = await req.json();
  if (!key || value === undefined) return NextResponse.json({ error: 'Key and value required' }, { status: 400 });

  const setting = await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'UPDATE_SETTING',
      entity: 'SystemSetting',
      entityId: key,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    },
  });

  return NextResponse.json(setting);
}
