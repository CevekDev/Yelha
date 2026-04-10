import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessage, validateTwilioRequest } from '@/lib/twilio';
import { callDeepSeek, buildSystemPrompt } from '@/lib/deepseek';
import { transcribeAudio } from '@/lib/whisper';
import {
  getOrCreateConversation,
  upsertContactContext,
  buildContactContextString,
  getRecentHistory,
  saveMessageExchange,
} from '@/lib/messages';

// Twilio sends form-encoded bodies, not JSON
function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const part of body.split('&')) {
    const [k, v] = part.split('=').map(decodeURIComponent);
    if (k) params[k] = v ?? '';
  }
  return params;
}

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

  const from: string = params.From ?? '';
  const body: string = params.Body ?? '';
  const mediaUrl: string = params.MediaUrl0 ?? '';
  const mediaContentType: string = params.MediaContentType0 ?? '';
  const numMedia = parseInt(params.NumMedia ?? '0', 10);
  const profileName: string = params.ProfileName ?? '';

  // Numéro sans le préfixe whatsapp:
  const phoneNumber = from.replace('whatsapp:', '');
  const contactId = phoneNumber;
  const contactName = profileName || null;

  const connection = await prisma.connection.findFirst({
    where: {
      platform: 'WHATSAPP',
      twilioWhatsAppNumber: phoneNumber,
      isActive: true,
    },
    include: {
      predefinedMessages: { where: { isActive: true }, orderBy: { priority: 'asc' } },
      detailResponses: { where: { isActive: true } },
    },
  });

  if (!connection) {
    return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
  }

  const user = await prisma.user.findUnique({ where: { id: connection.userId } });
  if (!user) {
    return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
  }

  // Vérifier les heures d'ouverture
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
  let messageType: 'text' | 'voice' | 'image' = 'text';
  let inboundContent = body;

  const isVoice =
    numMedia > 0 &&
    (mediaContentType.startsWith('audio/') || mediaContentType === 'application/ogg');
  const isImage = numMedia > 0 && mediaContentType.startsWith('image/');

  // ── Voice ────────────────────────────────────────────────────────────────
  if (isVoice && mediaUrl) {
    messageType = 'voice';
    tokensRequired = 2;
    if (!user.unlimitedTokens && user.tokenBalance < 2) {
      await sendWhatsAppMessage(from, '⚠️ Solde insuffisant pour traiter un message vocal.');
      return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
    }
    try {
      const audioRes = await fetch(mediaUrl, {
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
        },
      });
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      const transcript = await transcribeAudio(audioBuffer, mediaContentType || 'audio/ogg');
      if (!transcript) {
        return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
      }
      inboundContent = `[Vocal]: ${transcript}`;
    } catch (err) {
      console.error('[Twilio] Voice transcription error', err);
      await sendWhatsAppMessage(from, "Je n'ai pas pu traiter votre message vocal. Essayez en texte.");
      return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
    }
  }

  // ── Image ────────────────────────────────────────────────────────────────
  else if (isImage) {
    messageType = 'image';
    inboundContent = '[Image reçue]';
  }

  // ── Text ─────────────────────────────────────────────────────────────────
  else if (!body.trim()) {
    return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
  }

  // ── Vérifier solde tokens ─────────────────────────────────────────────────
  if (tokensRequired > 0 && !user.unlimitedTokens && user.tokenBalance < tokensRequired) {
    await sendWhatsAppMessage(from, '⚠️ Solde de jetons insuffisant. Rechargez votre compte sur Yelha.');
    return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
  }

  // ── Vérifier réponses prédéfinies (texte uniquement) ─────────────────────
  if (messageType === 'text') {
    const predefined = findPredefinedResponse(connection.predefinedMessages, body);
    if (predefined) {
      responseText = predefined;
      tokensRequired = 0;
    }
  }

  // ── Appel IA si pas de réponse prédéfinie ────────────────────────────────
  if (!responseText) {
    // Contexte contact
    const contactCtx = await prisma.contactContext.findUnique({
      where: { connectionId_contactId: { connectionId: connection.id, contactId } },
    });

    // Conversation + historique
    const conversation = await getOrCreateConversation({
      connectionId: connection.id,
      contactId,
      platform: 'WHATSAPP',
      contactName,
    });

    const history = await getRecentHistory(conversation.id);

    const systemPrompt = await buildConnectionSystemPrompt(
      connection,
      buildContactContextString(contactCtx)
    );

    const aiMessages = [
      ...history,
      { role: 'user' as const, content: inboundContent },
    ];

    responseText = await callDeepSeek(aiMessages, systemPrompt);
  }

  if (!responseText) {
    return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
  }

  // ── Débiter les tokens ────────────────────────────────────────────────────
  if (tokensRequired > 0 && !user.unlimitedTokens) {
    const updated = await prisma.user.updateMany({
      where: { id: connection.userId, tokenBalance: { gte: tokensRequired } },
      data: { tokenBalance: { decrement: tokensRequired } },
    });
    if (updated.count === 0) {
      await sendWhatsAppMessage(from, '⚠️ Solde de jetons insuffisant.');
      return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
    }
    const updatedUser = await prisma.user.findUnique({ where: { id: connection.userId } });
    await prisma.tokenTransaction.create({
      data: {
        userId: connection.userId,
        type: 'USAGE',
        amount: -tokensRequired,
        balance: updatedUser!.tokenBalance,
        description: `WhatsApp — ${messageType}`,
      },
    });
  }

  // ── Envoyer la réponse ────────────────────────────────────────────────────
  await sendWhatsAppMessage(from, responseText);

  // ── Sauvegarder les messages + élagage ───────────────────────────────────
  try {
    const conversation = await getOrCreateConversation({
      connectionId: connection.id,
      contactId,
      platform: 'WHATSAPP',
      contactName,
    });

    await saveMessageExchange({
      conversationId: conversation.id,
      inbound: {
        content: inboundContent,
        type: messageType,
        tokensUsed: tokensRequired,
      },
      outbound: { content: responseText },
    });

    // Mettre à jour le contexte contact
    await upsertContactContext(connection.id, contactId, { contactName });
  } catch (logErr) {
    console.error('[Twilio] Message save error', logErr);
  }

  return new NextResponse(TWIML_OK, { headers: { 'Content-Type': 'text/xml' } });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function buildConnectionSystemPrompt(
  connection: any,
  contactContext: string
): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'global_system_prompt' },
  });
  const globalPrompt = setting?.value ?? getDefaultPrompt();

  const predefinedStr = connection.predefinedMessages
    .map((m: any) => `Mots-clés: ${m.keywords.join(', ')}\nRéponse: ${m.response}`)
    .join('\n---\n');

  const detailStr = (connection.detailResponses || [])
    .map((d: any) => `Type de question: ${d.questionType}\nRéponse à adapter: ${d.response}`)
    .join('\n---\n');

  return buildSystemPrompt({
    botName: connection.botName ?? 'Assistant',
    businessName: connection.businessName ?? '',
    botPersonality: connection.botPersonality,
    predefinedResponses: predefinedStr,
    customInstructions: connection.customInstructions ?? '',
    globalPrompt,
    contactContext,
    detailResponses: detailStr,
  });
}

function getDefaultPrompt(): string {
  return `Tu es {botName}, l'assistant intelligent de {businessName}.
{botPersonality}
Détecte la langue de l'utilisateur et réponds dans la même langue (français, arabe, darija, anglais).
RÉPONSES PRÉDÉFINIES : {predefinedResponses}
INSTRUCTIONS PERSONNALISÉES : {customInstructions}`;
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
