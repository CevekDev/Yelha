import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const categories = await prisma.productCategory.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 });
  }

  try {
    const category = await prisma.productCategory.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Une catégorie avec ce nom existe déjà' }, { status: 409 });
    }
    throw e;
  }
}
