import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import crypto from 'crypto';

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID ?? '';
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET ?? process.env.META_APP_SECRET ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';
const REDIRECT_URI = `${APP_URL}/api/instagram/callback`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  // User denied permission
  if (errorParam) {
    return NextResponse.redirect(`${APP_URL}/fr/dashboard/connections?ig_error=denied`);
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${APP_URL}/fr/dashboard/connections?ig_error=missing_params`);
  }

  // Decode state
  let stateData: { userId: string; name: string; botName: string; businessName: string };
  try {
    stateData = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf-8'));
  } catch {
    return NextResponse.redirect(`${APP_URL}/fr/dashboard/connections?ig_error=invalid_state`);
  }

  try {
    // ── Step 1: Exchange code for short-lived Facebook User Access Token ──
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: INSTAGRAM_APP_ID,
        client_secret: INSTAGRAM_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[Instagram OAuth] Token exchange failed:', err);
      return NextResponse.redirect(`${APP_URL}/fr/dashboard/connections?ig_error=token_exchange`);
    }

    const tokenData = await tokenRes.json();
    const shortToken: string = tokenData.access_token;

    // ── Step 2: Exchange for long-lived User Access Token (60 days) ───────
    let userToken = shortToken;
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${INSTAGRAM_APP_ID}&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortToken}`
    );
    if (longTokenRes.ok) {
      const longData = await longTokenRes.json();
      if (longData.access_token) userToken = longData.access_token;
    }

    // ── Step 3: Get Facebook Pages → Instagram Business Account ──────────
    // The Messaging API requires a Page Access Token bound to the IG account
    let instagramUserId = '';
    let instagramUsername = '';
    let finalToken = userToken;

    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
    );
    if (pagesRes.ok) {
      const pagesData = await pagesRes.json();
      const pages: Array<{ id: string; access_token: string }> = pagesData.data ?? [];

      for (const page of pages) {
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        );
        if (!igRes.ok) continue;
        const igData = await igRes.json();
        const igAccountId: string | undefined = igData.instagram_business_account?.id;
        if (!igAccountId) continue;

        instagramUserId = igAccountId;
        finalToken = page.access_token; // Page token is used for Messaging API

        const meRes = await fetch(
          `https://graph.facebook.com/v19.0/${igAccountId}?fields=username,name&access_token=${page.access_token}`
        );
        if (meRes.ok) {
          const me = await meRes.json();
          instagramUsername = me.username ?? '';
        }
        break;
      }
    }

    if (!instagramUserId) {
      console.error('[Instagram OAuth] No Instagram Business Account found on any connected page');
      return NextResponse.redirect(`${APP_URL}/fr/dashboard/connections?ig_error=no_instagram_account`);
    }

    // ── Step 4: Check plan limits ─────────────────────────────────────────
    const BOT_LIMITS: Record<string, number> = { FREE: 1, STARTER: 1, BUSINESS: 3, PRO: 5, AGENCY: Infinity };
    const user = await prisma.user.findUnique({ where: { id: stateData.userId }, select: { planLevel: true } });
    const limit = BOT_LIMITS[user?.planLevel ?? 'FREE'] ?? 1;
    const existingCount = await prisma.connection.count({ where: { userId: stateData.userId, platform: 'INSTAGRAM' } });
    if (existingCount >= limit) {
      return NextResponse.redirect(`${APP_URL}/fr/dashboard/connections?ig_error=limit_reached`);
    }

    // ── Step 5: Create connection ─────────────────────────────────────────
    const encryptedToken = encrypt(finalToken);
    const verifyToken = crypto.randomUUID();

    const connection = await prisma.connection.create({
      data: {
        userId: stateData.userId,
        platform: 'INSTAGRAM',
        name: stateData.name || instagramUsername || 'Instagram Bot',
        botName: stateData.botName || 'Assistant',
        businessName: stateData.businessName || undefined,
        instagramAccessToken: encryptedToken,
        instagramUserId,
        instagramUsername,
        instagramWebhookVerifyToken: verifyToken,
      },
    });

    // Redirect back to connections page with success + webhook info
    const successParams = new URLSearchParams({
      ig_success: '1',
      ig_connection_id: connection.id,
      ig_verify_token: verifyToken,
      ig_username: instagramUsername,
    });
    return NextResponse.redirect(`${APP_URL}/fr/dashboard/connections?${successParams.toString()}`);

  } catch (err) {
    console.error('[Instagram OAuth] Error:', err);
    return NextResponse.redirect(`${APP_URL}/fr/dashboard/connections?ig_error=server_error`);
  }
}
