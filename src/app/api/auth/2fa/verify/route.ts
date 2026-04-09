import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { authenticator } from 'otplib';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const schema = z.object({
  code: z.string().length(6).regex(/^\d+$/),
  secret: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { code, secret } = parsed.data;

  const isValid = authenticator.verify({ token: code, secret });
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
  }

  // Generate 8 backup codes (show once, store hashed)
  const rawCodes = Array.from({ length: 8 }, () =>
    uuidv4().replace(/-/g, '').slice(0, 10)
  );
  const hashedCodes = await Promise.all(rawCodes.map((c) => bcrypt.hash(c, 10)));

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorBackupCodes: hashedCodes,
    },
  });

  return NextResponse.json({ success: true, backupCodes: rawCodes });
}
