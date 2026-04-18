import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'fb_test_messages' },
  });
  const messages = setting ? JSON.parse(setting.value) : [];
  return NextResponse.json(messages);
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await prisma.systemSetting.upsert({
    where: { key: 'fb_test_messages' },
    create: { key: 'fb_test_messages', value: '[]' },
    update: { value: '[]' },
  });
  return NextResponse.json({ ok: true });
}
