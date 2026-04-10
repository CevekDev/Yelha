import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/resend';
import { authRatelimit } from '@/lib/ratelimit';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { passwordSchema } from '@/lib/validations';

const TRIAL_TOKENS = 25;

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: passwordSchema,
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';

  const { success } = await authRatelimit.limit(ip);
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user with 25 free trial tokens
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      tokenBalance: TRIAL_TOKENS,
      trialUsed: true,
    },
  });

  // Log the trial token grant
  await prisma.tokenTransaction.create({
    data: {
      userId: user.id,
      type: 'TRIAL',
      amount: TRIAL_TOKENS,
      balance: TRIAL_TOKENS,
      description: `🎁 Essai gratuit — ${TRIAL_TOKENS} tokens offerts`,
    },
  });

  const token = uuidv4();
  await prisma.userVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const locale = req.headers.get('accept-language')?.split(',')[0]?.split('-')[0] || 'fr';
  await sendVerificationEmail(email, name, token, locale);

  return NextResponse.json({ success: true });
}
