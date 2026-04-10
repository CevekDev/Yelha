import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Vérifier que la conversation appartient à l'utilisateur
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      connection: { userId: session.user.id },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: params.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(messages);
}
