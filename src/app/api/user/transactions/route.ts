import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const transactions = await prisma.tokenTransaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      type: true,
      amount: true,
      balance: true,
      description: true,
      pricePaid: true,
      createdAt: true,
    },
  });

  return NextResponse.json(transactions);
}
