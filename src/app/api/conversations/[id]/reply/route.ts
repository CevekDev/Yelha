import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, connectionId } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 });

  // Verify conversation belongs to this user
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      connection: { userId: session.user.id },
    },
    select: { id: true, contactId: true, platform: true, connectionId: true },
  });
  if (!conversation) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

  // Get connection for bot token
  const connection = await prisma.connection.findFirst({
    where: { id: conversation.connectionId, userId: session.user.id },
    select: { telegramBotToken: true, platform: true },
  });
  if (!connection?.telegramBotToken) {
    return NextResponse.json({ error: 'Bot non configuré' }, { status: 400 });
  }

  const token = decrypt(connection.telegramBotToken);
  const chatId = conversation.contactId; // Telegram chat ID = contactId

  // Send via Telegram
  const telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message.trim() }),
  });

  if (!telegramRes.ok) {
    const err = await telegramRes.text();
    console.error('[reply] Telegram send failed:', err);
    return NextResponse.json({ error: 'Échec envoi Telegram' }, { status: 500 });
  }

  // Save the outbound message
  const saved = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'outbound',
      content: message.trim(),
      type: 'manual',
      tokensUsed: 0,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessage: new Date() },
  });

  return NextResponse.json(saved);
}
