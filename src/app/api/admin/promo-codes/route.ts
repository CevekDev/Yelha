import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET — list all promo codes
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const codes = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { uses: true } } },
  });

  return NextResponse.json(codes);
}

const createSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase().regex(/^[A-Z0-9_-]+$/, 'Code: lettres majuscules, chiffres, - et _ uniquement'),
  tokens: z.number().int().positive(),
  maxUses: z.number().int().positive().default(1),
  expiresAt: z.string().optional(),
  description: z.string().optional(),
});

// POST — create a promo code
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { code, tokens, maxUses, expiresAt, description } = parsed.data;

  try {
    const promo = await prisma.promoCode.create({
      data: {
        code,
        tokens,
        maxUses,
        description,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    return NextResponse.json(promo);
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Ce code existe déjà' }, { status: 400 });
    }
    throw e;
  }
}

// DELETE — deactivate a promo code
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await req.json();
  await prisma.promoCode.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
