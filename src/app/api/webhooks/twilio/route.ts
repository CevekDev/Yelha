import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage, validateTwilioRequest } from '@/lib/twilio';
import { callDeepSeek, buildSystemPrompt } from '@/lib/deepseek';
import { transcribeAudio } from '@/lib/whisper';
import { prisma as db } from '@/lib/prisma';

// Twilio sends form-encoded bodies, not JSON
function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const part of body.split('&')) {
    const [k, v] = part.split('=').map(decodeURIComponent);
    if (k) params[k] = v ?? '';
  }
  return params;
}

// Empty TwiML response — Twilio requires this format
const TWIML_OK = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = parseFormBody(rawBody);

  // Verify Twilio signature
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const signature = req.headers.get('x-twilio-signature') ?? '';
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`;

  if (!validateTwilioRequest(authToken, signature, url, params)) {
    console.error('[Twilio webhook] Invalid signature');
    return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
  }

  const from: string = params.From ?? ''; // e.g. "whatsapp:+213xxxxxxxxx"
  const body: string = params.Body ?? '';
  const mediaUrl: string = params.MediaUrl0 ?? '';
  const mediaContentType: string = params.MediaContentType0 ?? '';
  const numMedia = parseInt(params.NumMedia ?? '0', 10);

  // Extract plain number from whatsapp:+213...
  const phoneNumber = from.replace('whatsapp:', '');

  // Find connection linked to this WhatsApp number
  const connection = await prisma.connection.findFirst({
    where: {
      platform: 'WHATSAPP',
      twilioWhatsAppNumber: phoneNumber,
      isActive: true,
    },
    include: {
      predefinedMessages: { where: { isActive: true }, orderBy: { priority: 'asc' } },
    },
  });

  if (!connection) {
    // No connection found — silently ignore
    return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
  }

  const user = await prisma.user.findUnique({ where: { id: connection.userId } });
  if (!user) {
    return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
  }

  // Check business hours
  const now = new Date();
  if (
    connection.businessHours &&
    !isWithinBusinessHours(connection.businessHours, now, connection.timezone)
  ) {
    if (connection.awayMessage) {
      await sendWhatsAppMessage(from, connection.awayMessage);
    }
    return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
  }

  let responseText = '';
  let tokensRequired = 1;

  const isVoice =
    numMedia > 0 &&
    (mediaContentType.startsWith('audio/') || mediaContentType === 'application/ogg');

  const isImage = numMedia > 0 && mediaContentType.startsWith('image/');

  if (isVoice && mediaUrl) {
    tokensRequired = 2;
    if (user.tokenBalance < 2) {
      await sendWhatsAppMessage(from, 'Solde de jetons insuffisant. Veuillez recharger votre compte.');
      return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
    }

    try {
      const audioRes = await fetch(mediaUrl, {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(
              `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
            ).toString('base64'),
        },
      });
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      const mimeType = mediaContentType || 'audio/ogg';
      const transcript = await transcribeAudio(audioBuffer, mimeType);
      const systemPrompt = await buildConnectionSystemPrompt(connection);
      responseText = await callDeepSeek(
        [{ role: 'user', content: `[Message vocal transcrit]: ${transcript}` }],
        systemPrompt
      );
    } catch (err) {
      console.error('[Twilio webhook] Voice transcription error', err);
      responseText = "Je n'ai pas pu traiter votre message vocal. Pouvez-vous l'envoyer en texte ?";
      tokensRequired = 0;
    }
  } else if (isImage) {
    tokensRequired = 1;
    if (user.tokenBalance < 1) {
      await sendWhatsAppMessage(from, 'Solde de jetons insuffisant.');
      return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
    }
    const systemPrompt = await buildConnectionSystemPrompt(connection);
    responseText = await callDeepSeek(
      [{ role: 'user', content: "[Image reçue] Veuillez accuser réception et demander comment vous pouvez aider." }],
      systemPrompt
    );
  } else if (body.trim()) {
    // Text message
    const predefined = findPredefinedResponse(connection.predefinedMessages, body);
    if (predefined) {
      responseText = predefined;
      tokensRequired = 0;
    } else {
      if (user.tokenBalance < 1) {
        await sendWhatsAppMessage(from, 'Solde de jetons insuffisant. Veuillez recharger votre compte.');
        return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
      }
      const systemPrompt = await buildConnectionSystemPrompt(connection);
      responseText = await callDeepSeek([{ role: 'user', content: body }], systemPrompt);
    }
  }

  if (!responseText) {
    return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
  }

  // Deduct tokens atomically
  if (tokensRequired > 0) {
    const updated = await prisma.user.updateMany({
      where: { id: connection.userId, tokenBalance: { gte: tokensRequired } },
      data: { tokenBalance: { decrement: tokensRequired } },
    });
    if (updated.count === 0) {
      await sendWhatsAppMessage(from, 'Solde de jetons insuffisant.');
      return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
    }
    const updatedUser = await prisma.user.findUnique({ where: { id: connection.userId } });
    await prisma.tokenTransaction.create({
      data: {
        userId: connection.userId,
        type: 'USAGE',
        amount: -tokensRequired,
        balance: updatedUser!.tokenBalance,
        description: `Message WhatsApp (Twilio) traité`,
      },
    });
  }

  // Log the message
  try {
    let conversation = await prisma.conversation.findFirst({
      where: { connectionId: connection.id, contactId: phoneNumber },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          connectionId: connection.id,
          externalId: phoneNumber,
          platform: 'WHATSAPP',
          contactId: phoneNumber,
        },
      });
    }
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'inbound',
        content: body || '[media]',
        type: isVoice ? 'voice' : isImage ? 'image' : 'text',
        tokensUsed: tokensRequired,
      },
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: 'outbound',
        content: responseText,
        type: 'text',
        tokensUsed: 0,
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessage: new Date() },
    });
  } catch (logErr) {
    console.error('[Twilio webhook] Message log error', logErr);
  }

  await sendWhatsAppMessage(from, responseText);

  return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function buildConnectionSystemPrompt(connection: any): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'global_system_prompt' },
  });
  const globalPrompt = setting?.value ?? getDefaultPrompt();

  const predefinedStr = connection.predefinedMessages
    .map((m: any) => `Keywords: ${m.keywords.join(', ')}\nResponse: ${m.response}`)
    .join('\n---\n');

  return buildSystemPrompt({
    botName: connection.botName ?? 'Assistant',
    businessName: connection.businessName ?? '',
    botPersonality: connection.botPersonality,
    predefinedResponses: predefinedStr,
    customInstructions: connection.customInstructions ?? '',
    globalPrompt,
  });
}

function getDefaultPrompt(): string {
  return `You are {botName}, an intelligent assistant for {businessName}.
{botPersonality}
Detect user language and reply in same language.
PREDEFINED RESPONSES: {predefinedResponses}
CUSTOM INSTRUCTIONS: {customInstructions}`;
}

function findPredefinedResponse(messages: any[], text: string): string | null {
  const lower = text.toLowerCase();
  for (const msg of messages) {
    if (!msg.isActive) continue;
    for (const keyword of msg.keywords) {
      if (lower.includes(keyword.toLowerCase())) return msg.response;
    }
  }
  return null;
}

function isWithinBusinessHours(businessHours: any, now: Date, timezone: string): boolean {
  if (!businessHours) return true;
  try {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const day = dayNames[now.getDay()];
    const dayConfig = businessHours[day];
    if (!dayConfig?.open) return false;
    const [openH, openM] = dayConfig.start.split(':').map(Number);
    const [closeH, closeM] = dayConfig.end.split(':').map(Number);
    const current = now.getHours() * 60 + now.getMinutes();
    return current >= openH * 60 + openM && current <= closeH * 60 + closeM;
  } catch {
    return true;
  }
}
