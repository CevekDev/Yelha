import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL!;
const WA_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET!;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, connectionId } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Message vide' }, { status: 400 });

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, connection: { userId: session.user.id } },
    select: { id: true, contactId: true, platform: true, connectionId: true },
  });
  if (!conversation) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

  const connection = await prisma.connection.findFirst({
    where: { id: conversation.connectionId, userId: session.user.id },
    select: { telegramBotToken: true, platform: true, whatsappPhoneNumberId: true },
  });
  if (!connection) return NextResponse.json({ error: 'Connexion introuvable' }, { status: 404 });

  const text = message.trim();

  // ── Telegram ──────────────────────────────────────────────────────────────
  if (connection.platform === 'TELEGRAM') {
    if (!connection.telegramBotToken) {
      return NextResponse.json({ error: 'Bot Telegram non configuré' }, { status: 400 });
    }
    const token = decrypt(connection.telegramBotToken);
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: conversation.contactId, text, parse_mode: 'HTML' }),
    });
    if (!tgRes.ok) {
      return NextResponse.json({ error: 'Échec envoi Telegram' }, { status: 500 });
    }
  }

  // ── WhatsApp Web.js (Railway) ─────────────────────────────────────────────
  else if (connection.platform === 'WHATSAPP' && !connection.whatsappPhoneNumberId) {
    if (!WA_SERVICE_URL || !WA_SERVICE_SECRET) {
      return NextResponse.json({ error: 'Service WhatsApp non configuré' }, { status: 400 });
    }
    const waRes = await fetch(`${WA_SERVICE_URL}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-whatsapp-secret': WA_SERVICE_SECRET },
      body: JSON.stringify({ connectionId: conversation.connectionId, contactId: conversation.contactId, message: text }),
    });
    if (!waRes.ok) {
      const err = await waRes.json().catch(() => ({}));
      return NextResponse.json({ error: (err as any).error || 'Échec envoi WhatsApp' }, { status: 500 });
    }
  }

  // ── WhatsApp Meta API ─────────────────────────────────────────────────────
  else if (connection.platform === 'WHATSAPP' && connection.whatsappPhoneNumberId) {
    return NextResponse.json({ error: 'Meta WhatsApp API non supporté ici' }, { status: 400 });
  }

  else {
    return NextResponse.json({ error: 'Plateforme non supportée' }, { status: 400 });
  }

  // Save outbound message
  const saved = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'outbound',
      content: text,
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
