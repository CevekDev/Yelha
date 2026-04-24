import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authRatelimit, twoFARatelimit, getRedis } from '@/lib/ratelimit';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    // ── Rate limit by IP (prevent spray attacks) ──────────────────────────
    const ip = req.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success: ipOk } = await authRatelimit.limit(`2fa:verify:${ip}`);
    if (!ipOk) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });

    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });

    // ── Rate limit by email (prevent multi-IP brute force — 10 attempts/30 min) ──
    const { success: emailOk } = await twoFARatelimit.limit(`2fa:verify:${email.toLowerCase()}`);
    if (!emailOk) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans 30 minutes.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.twoFactorCode || !user.twoFactorCodeExpiry) {
      return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 400 });
    }

    if (new Date() > user.twoFactorCodeExpiry) {
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorCode: null, twoFactorCodeExpiry: null },
      });
      return NextResponse.json({ error: 'Code expiré. Demandez un nouveau code.' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(code.trim(), user.twoFactorCode);
    if (!isValid) {
      return NextResponse.json({ error: 'Code incorrect' }, { status: 400 });
    }

    // Clear the 2FA code
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorCode: null, twoFactorCodeExpiry: null },
    });

    // ── Store server-side one-shot token to prevent 2FA bypass in NextAuth ──
    // auth.ts Path A will verify this key and consume it (one-shot, 5 min TTL)
    try {
      const redis = getRedis();
      await redis.set(`2fa_ok:${user.id}`, '1', { ex: 300 });
    } catch {
      // Redis unavailable — proceed anyway (2FA code was valid)
      console.error('[2fa/verify] Redis unavailable — could not store one-shot token');
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[2fa/verify]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
