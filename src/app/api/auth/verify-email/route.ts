import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { code, email } = await req.json();

  if (!code || !email) {
    return NextResponse.json({ error: 'Code et email requis' }, { status: 400 });
  }

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  // If already verified, just return success
  if (user.emailVerified) return NextResponse.json({ success: true });

  // Find valid code
  const verificationToken = await prisma.userVerificationToken.findFirst({
    where: {
      userId: user.id,
      token: code,
      used: false,
      expires: { gt: new Date() },
    },
  });

  if (!verificationToken) {
    return NextResponse.json({ error: 'Code invalide ou expiré.' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    }),
    prisma.userVerificationToken.update({
      where: { id: verificationToken.id },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ success: true });
}
