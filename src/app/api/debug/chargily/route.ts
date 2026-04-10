import { NextResponse } from 'next/server';

// TEMPORARY DEBUG ROUTE — delete after fixing
export async function GET() {
  const rawKey = process.env.CHARGILY_API_KEY || '';

  // Show masked key info
  const keyInfo = {
    length: rawKey.length,
    starts_with: rawKey.substring(0, 12),
    ends_with: rawKey.substring(rawKey.length - 6),
    has_spaces: rawKey.includes(' '),
    has_newline: rawKey.includes('\n'),
    has_return: rawKey.includes('\r'),
    char_codes_start: Array.from(rawKey.substring(0, 5)).map(c => c.charCodeAt(0)),
  };

  // Detect URL
  const apiUrl = rawKey.startsWith('test_')
    ? 'https://pay.chargily.net/test/api/v2'
    : 'https://pay.chargily.net/api/v2';

  // Test actual Chargily auth with a simple GET
  let chargilyResponse: any = null;
  try {
    const res = await fetch(`${apiUrl}/balance`, {
      headers: {
        Authorization: `Bearer ${rawKey.trim()}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    const text = await res.text();
    chargilyResponse = { status: res.status, body: text.substring(0, 300) };
  } catch (e: any) {
    chargilyResponse = { error: e.message };
  }

  return NextResponse.json({ keyInfo, apiUrl, chargilyResponse });
}
