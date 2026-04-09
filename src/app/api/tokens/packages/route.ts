import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const packages = await prisma.tokenPackage.findMany({
    where: { isActive: true },
    orderBy: { tokens: 'asc' },
  });
  return NextResponse.json(packages);
}
