import crypto from 'crypto';

const CHARGILY_API_URL = 'https://pay.chargily.net/api/v2';

export interface ChargilyCheckoutResult {
  id: string;
  checkout_url: string;
  status: string;
}

/**
 * Create a Chargily ePay v2 checkout session.
 * Docs: https://dev.chargily.com/pay-v2/checkouts
 */
export async function createChargilyCheckout(params: {
  amount: number;       // in DZD (whole units, e.g. 1590)
  currency: 'DZD';
  customerEmail: string;
  customerName?: string;
  successUrl: string;
  failureUrl: string;
  webhookEndpoint: string;
  description?: string;
  metadata: Record<string, string>;
  locale?: 'ar' | 'fr' | 'en';
}): Promise<ChargilyCheckoutResult> {
  const res = await fetch(`${CHARGILY_API_URL}/checkouts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.CHARGILY_API_KEY}`,
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: params.currency.toLowerCase(), // Chargily expects 'dzd'
      success_url: params.successUrl,
      failure_url: params.failureUrl,
      webhook_endpoint: params.webhookEndpoint,
      description: params.description ?? 'AiReply Token Purchase',
      locale: params.locale ?? 'fr',
      collect_shipping_address: 0,
      metadata: params.metadata,
      customer: {
        name: params.customerName ?? params.customerEmail,
        email: params.customerEmail,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chargily API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    checkout_url: data.checkout_url,
    status: data.status,
  };
}

/**
 * Verify Chargily webhook signature.
 * Chargily sends the signature as a hex-encoded HMAC-SHA256 of the raw body,
 * keyed with your API secret key.
 * Header name: "signature"
 */
export function verifyChargilySignature(
  rawBody: Buffer,
  signature: string
): boolean {
  if (!signature) return false;
  const secret = process.env.CHARGILY_API_KEY!;
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
}

/** Format DZD price for display: 1590 → "1 590 DA" */
export function formatDZD(amount: number): string {
  // Use narrow no-break space as thousands separator (French style)
  return (
    amount.toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0') + ' DA'
  );
}
