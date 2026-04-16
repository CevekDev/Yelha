import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.productCategory.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 });

  const body = await req.json();
  const data: any = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;

  try {
    const updated = await prisma.productCategory.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Une catégorie avec ce nom existe déjà' }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const existing = await prisma.productCategory.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: 'Catégorie introuvable' }, { status: 404 });

  await prisma.productCategory.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
