import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const connection = await prisma.connection.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!connection) return NextResponse.json({ error: 'Bot introuvable' }, { status: 404 });

  const body = await req.json();
  const { botName, businessName, customInstructions, botPersonality, commerceType } = body;

  if (!botName || !botName.trim()) {
    return NextResponse.json({ error: 'Le nom du bot est obligatoire' }, { status: 400 });
  }
  if (!businessName || !businessName.trim()) {
    return NextResponse.json({ error: 'Le nom de l\'entreprise est obligatoire' }, { status: 400 });
  }

  const updated = await prisma.connection.update({
    where: { id: params.id },
    data: {
      botName: botName.trim(),
      businessName: businessName.trim(),
      customInstructions: customInstructions || null,
      botPersonality: botPersonality || null,
      ...(commerceType !== undefined ? { commerceType } : {}),
    },
  });

  // Inject a settings-reset marker in every conversation so the AI
  // ignores history before this point on the next message.
  const conversations = await prisma.conversation.findMany({
    where: { connectionId: params.id },
    select: { id: true },
  });
  if (conversations.length > 0) {
    await prisma.message.createMany({
      data: conversations.map((c) => ({
        conversationId: c.id,
        direction: 'system',
        type: 'settings_reset',
        content: '[SETTINGS_RESET]',
        tokensUsed: 0,
      })),
    });
  }

  return NextResponse.json(updated);
}
