export async function sendMessengerMessage(
  pageAccessToken: string,
  recipientId: string,
  text: string
): Promise<void> {
  const res = await fetch(`https://graph.facebook.com/v20.0/me/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${pageAccessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: 'RESPONSE',
    }),
  });
  if (!res.ok) console.error('[Messenger] Send failed:', await res.text());
}
