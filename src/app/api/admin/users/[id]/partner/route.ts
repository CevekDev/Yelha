import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPartnerEmail } from '@/lib/resend';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tokenLimit, message } = await req.json();

  // tokenLimit = null → illimité, sinon nombre entier
  const limit = tokenLimit ? Number(tokenLimit) : null;

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  // Upgrade user to PARTNER
  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      role: 'PARTNER',
      planLevel: 'AGENCY', // accès complet niveau agence
      isPartner: true,
      partnerSince: new Date(),
      partnerTokenLimit: limit,
      // Si tokenLimit défini, créditer ce montant
      ...(limit ? { tokenBalance: { increment: limit } } : { unlimitedTokens: true }),
    },
  });

  // Transaction si tokens alloués
  if (limit) {
    await prisma.tokenTransaction.create({
      data: {
        userId: params.id,
        type: 'ADMIN_GRANT', // dépense interne (pas un achat)
        amount: limit,
        balance: updated.tokenBalance,
        description: `🤝 Accord partenaire — ${limit.toLocaleString()} tokens alloués${message ? ` — ${message}` : ''}`,
      },
    });
  }

  // Email partenaire (async)
  sendPartnerEmail(user.email, user.name || 'Partenaire', limit, message || null).catch(
    err => console.error('[partner email]', err)
  );

  return NextResponse.json({ success: true, newBalance: updated.tokenBalance });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: params.id },
    data: {
      role: 'USER',
      isPartner: false,
      partnerSince: null,
      partnerTokenLimit: null,
      unlimitedTokens: false,
      planLevel: 'FREE',
    },
  });

  return NextResponse.json({ success: true });
}
