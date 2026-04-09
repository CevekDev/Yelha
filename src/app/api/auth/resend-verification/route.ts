import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/resend';
import { authRatelimit } from '@/lib/ratelimit';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await authRatelimit.limit(ip);
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return NextResponse.json({ success: true }); // Silent for security

  const token = uuidv4();
  await prisma.userVerificationToken.create({
    data: { userId: user.id, token, expires: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });

  await sendVerificationEmail(email, user.name || '', token);
  return NextResponse.json({ success: true });
}
