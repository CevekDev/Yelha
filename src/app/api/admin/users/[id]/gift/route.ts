import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { tokens, reason } = await req.json();
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
      description: reason || `Offert par l'administrateur`,
    },
  });

  return NextResponse.json({ success: true, newBalance: updated.tokenBalance });
}
