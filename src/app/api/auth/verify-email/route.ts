import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const verificationToken = await prisma.userVerificationToken.findUnique({ where: { token } });

  if (!verificationToken || verificationToken.used || verificationToken.expires < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: verificationToken.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.userVerificationToken.update({
      where: { id: verificationToken.id },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}
