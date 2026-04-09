import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { predefinedMessageSchema } from '@/lib/validations';

async function verifyOwnership(connectionId: string, userId: string) {
  return prisma.connection.findFirst({ where: { id: connectionId, userId } });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conn = await verifyOwnership(params.id, session.user.id);
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const messages = await prisma.predefinedMessage.findMany({
    where: { connectionId: params.id },
    orderBy: { priority: 'asc' },
  });
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const conn = await verifyOwnership(params.id, session.user.id);
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const count = await prisma.predefinedMessage.count({ where: { connectionId: params.id } });
  if (count >= 20) return NextResponse.json({ error: 'Maximum 20 predefined messages allowed' }, { status: 400 });

  const body = await req.json();
  const parsed = predefinedMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const message = await prisma.predefinedMessage.create({
    data: { connectionId: params.id, ...parsed.data },
  });
  return NextResponse.json(message);
}
