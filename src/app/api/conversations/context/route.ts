import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get('connectionId');
  const contactId = searchParams.get('contactId');

  if (!connectionId || !contactId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  // Vérifier ownership
  const connection = await prisma.connection.findFirst({
    where: { id: connectionId, userId: session.user.id },
  });
  if (!connection) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const ctx = await prisma.contactContext.findUnique({
    where: { connectionId_contactId: { connectionId, contactId } },
  });

  if (!ctx) return NextResponse.json(null);
  return NextResponse.json(ctx);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { connectionId, contactId, wilaya, notes, contactName } = body;

  if (!connectionId || !contactId) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
  }

  // Vérifier ownership
  const connection = await prisma.connection.findFirst({
    where: { id: connectionId, userId: session.user.id },
  });
  if (!connection) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const ctx = await prisma.contactContext.upsert({
    where: { connectionId_contactId: { connectionId, contactId } },
    create: {
      connectionId,
      contactId,
      contactName: contactName ?? null,
      wilaya: wilaya ?? null,
      notes: notes ?? null,
      lastSeenAt: new Date(),
    },
    update: {
      ...(wilaya !== undefined && { wilaya: wilaya || null }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(contactName !== undefined && { contactName: contactName || null }),
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json(ctx);
}
