import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import { callDeepSeek, buildSystemPrompt, GLOBAL_SYSTEM_PROMPT } from '@/lib/deepseek';
import { sendLowTokenEmail } from '@/lib/resend';
import {
  getOrCreateConversation,
  upsertContactContext,
  buildContactContextString,
  getRecentHistory,
  saveMessageExchange,
  logCost,
} from '@/lib/messages';
import {
  loginInstagram,
  sendInstagramPrivateDM,
  getNewInstagramMessages,
} from '@/lib/instagram-private';

// Vercel cron protection
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connections = await prisma.connection.findMany({
    where: {
      platform: 'INSTAGRAM',
      isActive: true,
      isSuspended: false,
      instagramSessionData: { not: null },
    },
    include: {
      predefinedMessages: { where: { isActive: true }, orderBy: { priority: 'asc' } },
      detailResponses: { where: { isActive: true } },
    },
  });

  const results: { id: string; processed: number; error?: string }[] = [];

  for (const connection of connections) {
    let processed = 0;
    try {
      let sessionData = connection.instagramSessionData!;
      const afterTs = connection.instagramLastMessageTs ?? BigInt(0);

      let messages;
      try {
        messages = await getNewInstagramMessages(sessionData, afterTs);
      } catch (sessionErr: unknown) {
        // Session expired → re-login
        if (!connection.instagramPassword) {
          results.push({ id: connection.id, processed: 0, error: 'Session expired, no password stored' });
          continue;
        }
        const pwd = decrypt(connection.instagramPassword);
        const username = connection.instagramUsername!;
        sessionData = await loginInstagram(username, pwd);
        await prisma.connection.update({
          where: { id: connection.id },
          data: { instagramSessionData: sessionData },
        });
        messages = await getNewInstagramMessages(sessionData, afterTs);
      }

      if (messages.length === 0) {
        results.push({ id: connection.id, processed: 0 });
        continue;
      }

      const user = await prisma.user.findUnique({ where: { id: connection.userId } });
      if (!user || user.isBanned) {
        results.push({ id: connection.id, processed: 0, error: 'User banned or not found' });
        continue;
      }

      let maxTs = afterTs;

      for (const msg of messages) {
        if (msg.timestampMicros > maxTs) maxTs = msg.timestampMicros;

        const contactId = msg.senderId;
        const text = msg.text.trim();
        if (!text) continue;

        // Check balance
        if (!user.unlimitedTokens && user.tokenBalance < 1) continue;

        const conversation = await getOrCreateConversation({
          connectionId: connection.id,
          contactId,
          platform: 'INSTAGRAM',
        });
        if (conversation.isSuspended) continue;

        let responseText = '';
        let tokensRequired = 1;

        // Predefined keywords (0 tokens)
        const lower = text.toLowerCase();
        const predefined = connection.predefinedMessages.find((m) =>
          m.keywords.some((k) => lower.includes(k.toLowerCase()))
        );
        if (predefined) {
          responseText = predefined.response;
          tokensRequired = 0;
        }

        // AI call
        if (!responseText) {
          const contactCtx = await prisma.contactContext.findUnique({
            where: { connectionId_contactId: { connectionId: connection.id, contactId } },
          });
          const history = await getRecentHistory(conversation.id);
          const isFirstMessage = history.length === 0;
          const systemPrompt = await buildInstagramSystemPrompt(
            connection,
            buildContactContextString(contactCtx),
            isFirstMessage
          );
          const aiMessages = [...history, { role: 'user' as const, content: text }];
          const rawResponse = await callDeepSeek(aiMessages, systemPrompt);
          responseText = rawResponse.replace(/\[HORS_SUJET\]/g, '').trim();
        }

        if (!responseText) continue;

        // Log API cost
        if (tokensRequired > 0) logCost(user.id, 'deepseek_text');

        // Deduct tokens
        if (tokensRequired > 0 && !user.unlimitedTokens) {
          try {
            const updated = await prisma.user.update({
              where: { id: connection.userId, tokenBalance: { gte: tokensRequired } },
              data: { tokenBalance: { decrement: tokensRequired } },
              select: { tokenBalance: true },
            });
            await prisma.tokenTransaction.create({
              data: {
                userId: connection.userId,
                type: 'USAGE',
                amount: -tokensRequired,
                balance: updated.tokenBalance,
                description: 'Instagram DM',
              },
            });
            if (updated.tokenBalance <= 100) {
              const fresh = await prisma.user.findUnique({
                where: { id: connection.userId },
                select: { lowTokenAlertSent: true, email: true, name: true },
              });
              if (fresh && !fresh.lowTokenAlertSent) {
                await prisma.user.update({ where: { id: connection.userId }, data: { lowTokenAlertSent: true } });
                try { await sendLowTokenEmail(fresh.email, fresh.name ?? '', updated.tokenBalance); } catch {}
              }
            }
          } catch {
            continue; // insufficient balance
          }
        }

        // Send reply
        await sendInstagramPrivateDM(sessionData, contactId, responseText);

        // Save to DB
        await saveMessageExchange({
          conversationId: conversation.id,
          inbound: { content: text, type: 'text', tokensUsed: tokensRequired },
          outbound: { content: responseText },
        });
        await upsertContactContext(connection.id, contactId, { contactName: null, metadata: {} });

        processed++;
      }

      // Update last message timestamp
      if (maxTs > afterTs) {
        await prisma.connection.update({
          where: { id: connection.id },
          data: { instagramLastMessageTs: maxTs },
        });
      }

      results.push({ id: connection.id, processed });
    } catch (err: unknown) {
      console.error(`[Instagram cron] Connection ${connection.id} error:`, err);
      results.push({ id: connection.id, processed, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, results });
}

async function buildInstagramSystemPrompt(
  connection: any,
  contactContext: string,
  isFirstMessage: boolean
): Promise<string> {
  const predefinedStr = connection.predefinedMessages
    .map((m: any) => `Mots-clés: ${m.keywords.join(', ')}\nRéponse: ${m.response}`)
    .join('\n---\n');

  const detailStr = (connection.detailResponses || [])
    .map((d: any) => `Type: ${d.questionType}\nRéponse à adapter: ${d.response}`)
    .join('\n---\n');

  const products = await prisma.product.findMany({
    where: { userId: connection.userId, isActive: true },
    select: { name: true, description: true, price: true },
    take: 50,
  });

  const productsStr = products.length > 0
    ? products.map((p: any) => `• ${p.name}${p.price ? ` — ${p.price} DA` : ''}`).join('\n')
    : 'Aucun produit configuré.';

  const prompt = buildSystemPrompt({
    botName: connection.botName || 'Assistant',
    businessName: connection.businessName || connection.name || 'la boutique',
    botPersonality: connection.botPersonality,
    predefinedResponses: predefinedStr || 'Aucune',
    customInstructions: connection.customInstructions || 'Aucune',
    globalPrompt: GLOBAL_SYSTEM_PROMPT,
    contactContext,
    detailResponses: detailStr,
    isFirstMessage,
    commerceType: connection.commerceType || 'products',
  });

  const productDetailsStr = products
    .filter((p: any) => p.description)
    .map((p: any) => `• ${p.name} : ${p.description}`)
    .join('\n');

  return prompt + `\n\n══════════════════════════════════════
CATALOGUE PRODUITS (Instagram DM)
══════════════════════════════════════
${productsStr}

RÈGLES PRODUITS (STRICTES) :
- Donne nom et prix uniquement par défaut.
- ❌ NE MENTIONNE JAMAIS le stock sauf si explicitement demandé.
- ❌ NE donne PAS la description sauf si le client demande des détails.
- ❌ N'invente JAMAIS un produit absent de cette liste.

${productDetailsStr ? `DESCRIPTIONS (uniquement si demandé) :\n${productDetailsStr}` : ''}`;
}
