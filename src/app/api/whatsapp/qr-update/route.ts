import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Called by Railway microservice when a QR code is generated
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-whatsapp-secret');
  const expected = process.env.WHATSAPP_SERVICE_SECRET;
  if (!secret || !expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const secretBuf = Buffer.from(secret);
  const expectedBuf = Buffer.from(expected);
  if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { connectionId, userId, qrDataUrl, error } = await req.json();
  if (!connectionId) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  if (error) {
    // Puppeteer failed — store error state so modal can show it
    await prisma.whatsAppSession.updateMany({
      where: { connectionId },
      data: { waStatus: 'error', qrDataUrl: null },
    });
    return NextResponse.json({ ok: true });
  }

  if (!qrDataUrl) {
    return NextResponse.json({ error: 'Missing qrDataUrl' }, { status: 400 });
  }

  await prisma.whatsAppSession.upsert({
    where: { connectionId },
    create: { userId, connectionId, isActive: false, waStatus: 'qr', qrDataUrl },
    update: { waStatus: 'qr', qrDataUrl },
  });

  return NextResponse.json({ ok: true });
}
