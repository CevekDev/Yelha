import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAX_STORED = 50;

// GET — Meta webhook verification challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;
  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// POST — receive Messenger messages from Meta
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  // Always respond 200 to Meta immediately
  if (!body || body.object !== 'page') {
    return NextResponse.json({ ok: true });
  }

  const incoming: { senderId: string; text: string; ts: number }[] = [];

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const text = event.message?.text;
      const senderId = event.sender?.id;
      if (text && senderId && !event.message?.is_echo) {
        incoming.push({ senderId, text, ts: event.timestamp ?? Date.now() });
      }
    }
  }

  if (incoming.length > 0) {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'fb_test_messages' },
    });
    const existing: typeof incoming = setting ? JSON.parse(setting.value) : [];
    const updated = [...existing, ...incoming].slice(-MAX_STORED);

    await prisma.systemSetting.upsert({
      where: { key: 'fb_test_messages' },
      create: { key: 'fb_test_messages', value: JSON.stringify(updated) },
      update: { value: JSON.stringify(updated) },
    });
  }

  return NextResponse.json({ ok: true });
}
