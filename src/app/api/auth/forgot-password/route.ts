import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/resend';
import { authRatelimit } from '@/lib/ratelimit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const schema = z.object({ email: z.string().email(), locale: z.string().optional() });

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
  const { success } = await authRatelimit.limit(ip);
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

  const { email, locale = 'fr' } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ success: true }); // Silent

  const token = uuidv4();
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expires: new Date(Date.now() + 15 * 60 * 1000) },
  });

  await sendPasswordResetEmail(email, user.name || '', token, locale);
  return NextResponse.json({ success: true });
}
