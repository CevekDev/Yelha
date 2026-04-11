import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendAdminGiftEmail } from '@/lib/resend';

const PACKAGES: Record<string, { name: string; tokens: number; price: number }> = {
  starter:  { name: 'Starter',  tokens: 500,   price: 2500 },
  business: { name: 'Business', tokens: 2000,  price: 5000 },
  pro:      { name: 'Pro',      tokens: 5000,  price: 10000 },
  agency:   { name: 'Agency',   tokens: 15000, price: 22000 },
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tokens: rawTokens, reason, packKey } = await req.json();

  let tokens: number;
  let packName: string | null = null;
  let pricePaid: number | null = null; // only for PACK_GRANT (counted as revenue)
  let transactionType: 'PACK_GRANT' | 'ADMIN_GRANT' = 'ADMIN_GRANT';

  if (packKey && PACKAGES[packKey]) {
    // Pack offert → compté comme REVENU (comme si l'utilisateur avait acheté)
    tokens = PACKAGES[packKey].tokens;
    packName = PACKAGES[packKey].name;
    pricePaid = PACKAGES[packKey].price;
    transactionType = 'PACK_GRANT';
  } else {
    // Tokens personnalisés → DÉPENSE INTERNE (ne compte pas comme revenu)
    tokens = Number(rawTokens);
    transactionType = 'ADMIN_GRANT';
  }

  if (!tokens || tokens <= 0) {
    return NextResponse.json({ error: 'Nombre de tokens invalide' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { tokenBalance: { increment: tokens } },
  });

  const description = transactionType === 'PACK_GRANT'
    ? `🎁 Pack ${packName} offert par l'administrateur${reason ? ` — ${reason}` : ''}`
    : (reason || `🎁 Tokens offerts par l'administrateur`);

  await prisma.tokenTransaction.create({
    data: {
      userId: params.id,
      type: transactionType,
      amount: tokens,
      balance: updated.tokenBalance,
      description,
      // pricePaid seulement pour PACK_GRANT (comptabilité → revenu)
      ...(pricePaid !== null ? { pricePaid } : {}),
    },
  });

  // Email notification (async)
  sendAdminGiftEmail(user.email, user.name || 'Client', tokens, packName, reason || null).catch(
    err => console.error('[gift email]', err)
  );

  return NextResponse.json({ success: true, newBalance: updated.tokenBalance });
}
