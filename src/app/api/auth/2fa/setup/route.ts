import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const secret = authenticator.generateSecret();
  const otpAuth = authenticator.keyuri(session.user.email!, 'AiReply', secret);
  const qrCode = await QRCode.toDataURL(otpAuth);
  return NextResponse.json({ secret, qrCode });
}
