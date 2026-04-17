import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID ?? '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';
const REDIRECT_URI = `${APP_URL}/api/instagram/callback`;

// Scopes needed for Instagram DM bot via Facebook Login (Meta Graph API)
// instagram_basic is deprecated — use Facebook Login dialog with these scopes
const SCOPES = [
  'instagram_manage_messages',
  'pages_manage_metadata',
  'pages_show_list',
  'pages_read_engagement',
].join(',');

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!INSTAGRAM_APP_ID) {
    return NextResponse.json({ error: 'INSTAGRAM_APP_ID non configuré' }, { status: 500 });
  }

  // Encode connection form data in the state param (stateless OAuth)
  const url = new URL(req.url);
  const name = url.searchParams.get('name') ?? '';
  const botName = url.searchParams.get('botName') ?? 'Assistant';
  const businessName = url.searchParams.get('businessName') ?? '';

  const state = Buffer.from(
    JSON.stringify({ userId: session.user.id, name, botName, businessName })
  ).toString('base64url');

  // Use Facebook Login dialog (not the deprecated Instagram Basic Display API)
  const oauthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  oauthUrl.searchParams.set('client_id', INSTAGRAM_APP_ID);
  oauthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  oauthUrl.searchParams.set('scope', SCOPES);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('state', state);

  return NextResponse.redirect(oauthUrl.toString());
}
