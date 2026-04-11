import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendAdminGiftEmail } from '@/lib/resend';

const PACKAGES: Record<string, { name: string; tokens: number }> = {
  starter:  { name: 'Starter',  tokens: 500 },
  business: { name: 'Business', tokens: 2000 },
  pro:      { name: 'Pro',      tokens: 5000 },
  agency:   { name: 'Agency',   tokens: 15000 },
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tokens: rawTokens, reason, packKey } = await req.json();

  // Resolve token count: either from packKey or direct amount
  let tokens: number;
  let packName: string | null = null;

  if (packKey && PACKAGES[packKey]) {
    tokens = PACKAGES[packKey].tokens;
    packName = PACKAGES[packKey].name;
  } else {
    tokens = Number(rawTokens);
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

  await prisma.tokenTransaction.create({
    data: {
      userId: params.id,
      type: 'ADMIN_GRANT',
      amount: tokens,
      balance: updated.tokenBalance,
      description: packName
        ? `🎁 Pack ${packName} offert par l'administrateur${reason ? ` — ${reason}` : ''}`
        : reason || `🎁 Tokens offerts par l'administrateur`,
    },
  });

  // Send email notification to user (async, don't block response)
  sendAdminGiftEmail(user.email, user.name || 'Client', tokens, packName, reason || null).catch(
    err => console.error('[gift email]', err)
  );

  return NextResponse.json({ success: true, newBalance: updated.tokenBalance });
}
