import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { callDeepSeek, buildSystemPrompt } from '@/lib/deepseek';
import { transcribeAudio } from '@/lib/whisper';
import {
  getOrCreateConversation,
  upsertContactContext,
  buildContactContextString,
  getRecentHistory,
  saveMessageExchange,
} from '@/lib/messages';

export async function POST(
  req: NextRequest,
  { params }: { params: { connectionId: string } }
) {
  const body = await req.json();

  const connection = await prisma.connection.findFirst({
    where: { id: params.connectionId, platform: 'TELEGRAM', isActive: true },
    include: {
      predefinedMessages: { where: { isActive: true }, orderBy: { priority: 'asc' } },
      detailResponses: { where: { isActive: true } },
    },
  });

  if (!connection || !connection.telegramBotToken) {
    return NextResponse.json({ ok: true });
  }

  const token = decrypt(connection.telegramBotToken);
  const message = body.message || body.callback_query?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId: number = message.chat.id;
  const text: string = message.text || '';
  const telegramUser = message.from;
  const contactId = String(chatId);
  const contactName = telegramUser
    ? [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') || null
    : null;

  const user = await prisma.user.findUnique({ where: { id: connection.userId } });
  if (!user) return NextResponse.json({ ok: true });

  // Handle /start command
  if (text === '/start') {
    if (connection.welcomeMessage) {
      await sendTelegramMessage(token, chatId, connection.welcomeMessage);
    }
    // Créer le contexte contact dès le /start
    await upsertContactContext(connection.id, contactId, { contactName });
    return NextResponse.json({ ok: true });
  }

  let responseText = '';
  let tokensRequired = 1;
  let messageType: 'text' | 'voice' | 'image' = 'text';
  let inboundContent = text;

  // ── Voice ────────────────────────────────────────────────────────────────
  if (message.voice) {
    messageType = 'voice';
    tokensRequired = 2;
    if (!user.unlimitedTokens && user.tokenBalance < 2) {
      await sendTelegramMessage(token, chatId, '⚠️ Solde insuffisant pour traiter un message vocal.');
      return NextResponse.json({ ok: true });
    }
    try {
      const fileRes = await fetch(
        `https://api.telegram.org/bot${token}/getFile?file_id=${message.voice.file_id}`
      );
      const fileData = await fileRes.json();
      const filePath = fileData.result?.file_path;
      if (!filePath) return NextResponse.json({ ok: true });

      const audioRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      const transcript = await transcribeAudio(audioBuffer, 'audio/ogg');
      if (!transcript) return NextResponse.json({ ok: true });

      inboundContent = `[Vocal]: ${transcript}`;
    } catch (err) {
      console.error('[Telegram] Voice transcription error', err);
      await sendTelegramMessage(token, chatId, "Je n'ai pas pu traiter votre message vocal. Essayez en texte.");
      return NextResponse.json({ ok: true });
    }
  }

  // ── Image ────────────────────────────────────────────────────────────────
  else if (message.photo) {
    messageType = 'image';
    tokensRequired = 1;
    inboundContent = '[Image reçue]';
  }

  // ── Text ─────────────────────────────────────────────────────────────────
  else if (!text) {
    return NextResponse.json({ ok: true });
  }

  // ── Vérifier solde tokens ─────────────────────────────────────────────────
  if (tokensRequired > 0 && !user.unlimitedTokens && user.tokenBalance < tokensRequired) {
    await sendTelegramMessage(token, chatId, '⚠️ Solde de jetons insuffisant. Rechargez votre compte sur Yelha.');
    return NextResponse.json({ ok: true });
  }

  // ── Vérifier réponses prédéfinies (texte uniquement) ─────────────────────
  if (messageType === 'text' && text) {
    const lower = text.toLowerCase();
    const predefined = connection.predefinedMessages.find((m) =>
      m.keywords.some((k) => lower.includes(k.toLowerCase()))
    );
    if (predefined) {
      responseText = predefined.response;
      tokensRequired = 0;
    }
  }

  // ── Appel IA si pas de réponse prédéfinie ────────────────────────────────
  if (!responseText) {
    // Charger le contexte du contact
    const contactCtx = await prisma.contactContext.findUnique({
      where: { connectionId_contactId: { connectionId: connection.id, contactId } },
    });

    // Charger la conversation et l'historique
    const conversation = await getOrCreateConversation({
      connectionId: connection.id,
      contactId,
      platform: 'TELEGRAM',
      contactName,
    });

    const history = await getRecentHistory(conversation.id);

    // Construire le système prompt avec tout le contexte
    const systemPrompt = await buildTelegramSystemPrompt(
      connection,
      buildContactContextString(contactCtx)
    );

    // Construire les messages pour l'IA (historique + message actuel)
    const aiMessages = [
      ...history,
      { role: 'user' as const, content: inboundContent },
    ];

    responseText = await callDeepSeek(aiMessages, systemPrompt);
  }

  if (!responseText) return NextResponse.json({ ok: true });

  // ── Débiter les tokens ────────────────────────────────────────────────────
  if (tokensRequired > 0 && !user.unlimitedTokens) {
    const updated = await prisma.user.updateMany({
      where: { id: connection.userId, tokenBalance: { gte: tokensRequired } },
      data: { tokenBalance: { decrement: tokensRequired } },
    });
    if (updated.count === 0) {
      await sendTelegramMessage(token, chatId, '⚠️ Solde de jetons insuffisant.');
      return NextResponse.json({ ok: true });
    }
    const newUser = await prisma.user.findUnique({ where: { id: connection.userId } });
    await prisma.tokenTransaction.create({
      data: {
        userId: connection.userId,
        type: 'USAGE',
        amount: -tokensRequired,
        balance: newUser!.tokenBalance,
        description: `Telegram — ${messageType}`,
      },
    });
  }

  // ── Envoyer la réponse ────────────────────────────────────────────────────
  await sendTelegramMessage(token, chatId, responseText);

  // ── Sauvegarder les messages + élagage ───────────────────────────────────
  try {
    const conversation = await getOrCreateConversation({
      connectionId: connection.id,
      contactId,
      platform: 'TELEGRAM',
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

    // Mettre à jour le contexte contact (nom depuis Telegram)
    await upsertContactContext(connection.id, contactId, { contactName });
  } catch (err) {
    console.error('[Telegram] Message save error', err);
  }

  return NextResponse.json({ ok: true });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

async function buildTelegramSystemPrompt(
  connection: any,
  contactContext: string
): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'global_system_prompt' },
  });
  const globalPrompt = setting?.value || getDefaultPrompt();

  const predefinedStr = connection.predefinedMessages
    .map((m: any) => `Mots-clés: ${m.keywords.join(', ')}\nRéponse: ${m.response}`)
    .join('\n---\n');

  const detailStr = (connection.detailResponses || [])
    .map((d: any) => `Type de question: ${d.questionType}\nRéponse à adapter: ${d.response}`)
    .join('\n---\n');

  return buildSystemPrompt({
    botName: connection.botName || 'Assistant',
    businessName: connection.businessName || '',
    botPersonality: connection.botPersonality,
    predefinedResponses: predefinedStr,
    customInstructions: connection.customInstructions || '',
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
