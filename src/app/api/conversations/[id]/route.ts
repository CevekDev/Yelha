import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership via connection
  const conv = await prisma.conversation.findFirst({
    where: { id: params.id, connection: { userId: session.user.id } },
  });
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.conversation.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
