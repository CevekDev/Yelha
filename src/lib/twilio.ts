import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendWhatsAppMessage(to: string, body: string): Promise<string> {
  // Ensure the number is in whatsapp: format
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const from = process.env.TWILIO_WHATSAPP_NUMBER!;

  const message = await client.messages.create({
    from,
    to: toFormatted,
    body,
  });

  return message.sid;
}

export function validateTwilioRequest(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(authToken, signature, url, params);
}

export { client as twilioClient };
