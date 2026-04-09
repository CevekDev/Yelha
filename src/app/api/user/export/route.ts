import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      connections: {
        select: { id: true, platform: true, name: true, businessName: true, createdAt: true },
      },
      tokenTransactions: true,
    },
  });

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user!.id,
      name: user!.name,
      email: user!.email,
      createdAt: user!.createdAt,
      tokenBalance: user!.tokenBalance,
    },
    connections: user!.connections,
    tokenHistory: user!.tokenTransactions,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="aireply-data-export.json"',
    },
  });
}
