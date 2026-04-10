import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  code: z.string().min(1).toUpperCase(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
  }

  const { code } = parsed.data;
  const userId = session.user.id;

  const promo = await prisma.promoCode.findUnique({
    where: { code },
    include: { uses: { where: { userId } } },
  });

  if (!promo || !promo.isActive) {
    return NextResponse.json({ error: 'Code promo invalide ou désactivé' }, { status: 404 });
  }

  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Ce code promo a expiré' }, { status: 400 });
  }

  if (promo.usedCount >= promo.maxUses) {
    return NextResponse.json({ error: 'Ce code promo a atteint son nombre maximum d\'utilisations' }, { status: 400 });
  }

  if (promo.uses.length > 0) {
    return NextResponse.json({ error: 'Vous avez déjà utilisé ce code promo' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const newBalance = user.tokenBalance + promo.tokens;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { tokenBalance: newBalance },
    }),
    prisma.tokenTransaction.create({
      data: {
        userId,
        type: 'PROMO',
        amount: promo.tokens,
        balance: newBalance,
        description: `🎟️ Code promo ${code} — +${promo.tokens} tokens`,
      },
    }),
    prisma.promoCodeUse.create({
      data: { promoCodeId: promo.id, userId },
    }),
    prisma.promoCode.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    }),
  ]);

  return NextResponse.json({ success: true, tokensAdded: promo.tokens, newBalance });
}
