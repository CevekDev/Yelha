import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createChargilyCheckout } from '@/lib/chargily';
import { apiRatelimit } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') ?? session.user.id;
  const { success } = await apiRatelimit.limit(ip);
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { packageId, locale = 'fr' } = await req.json();
  if (!packageId) return NextResponse.json({ error: 'Package ID required' }, { status: 400 });

  const pkg = await prisma.tokenPackage.findUnique({ where: { id: packageId, isActive: true } });
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const checkout = await createChargilyCheckout({
    amount: pkg.price, // already in DZD
    currency: 'DZD',
    customerEmail: user.email!,
    customerName: user.name || undefined,
    successUrl: `${appUrl}/${locale}/dashboard/tokens?success=true`,
    failureUrl: `${appUrl}/${locale}/dashboard/tokens?canceled=true`,
    webhookEndpoint: `${appUrl}/api/webhooks/chargily`,
    description: `AiReply — ${pkg.name} (${pkg.tokens} tokens)`,
    metadata: {
      userId: session.user.id,
      packageId: pkg.id,
      tokens: pkg.tokens.toString(),
    },
  });

  return NextResponse.json({ url: checkout.checkout_url });
}
