import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  platform: z.enum(['instagram', 'facebook']),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { email, platform } = parsed.data;

  await prisma.waitlistEmail.upsert({
    where: { email },
    update: { platform }, // update platform if already registered
    create: { email, platform },
  });

  return NextResponse.json({ success: true });
}
