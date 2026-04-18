import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });

  const { recipientId, message, pageToken } = body as {
    recipientId: string;
    message: string;
    pageToken: string;
  };

  if (!recipientId?.trim() || !message?.trim() || !pageToken?.trim()) {
    return NextResponse.json(
      { error: 'recipientId, message et pageToken sont requis' },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken.trim()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId.trim() },
        message: { text: message.trim() },
        messaging_type: 'MESSAGE_TAG',
        tag: 'HUMAN_AGENT',
      }),
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message || `Facebook API erreur ${res.status}`;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const data = await res.json();
  return NextResponse.json({ ok: true, messageId: data.message_id });
}
