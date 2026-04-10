import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  userId: z.string(),
  amount: z.number().int().positive().max(1000000),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { userId, amount, description } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const newBalance = user.tokenBalance + amount;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { tokenBalance: newBalance },
    }),
    prisma.tokenTransaction.create({
      data: {
        userId,
        type: 'ADMIN_GRANT',
        amount,
        balance: newBalance,
        description: description || `🎁 Tokens ajoutés par l'admin`,
      },
    }),
  ]);

  return NextResponse.json({ success: true, newBalance });
}
