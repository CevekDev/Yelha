import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { callDeepSeek, buildSystemPrompt, GLOBAL_SYSTEM_PROMPT } from '@/lib/deepseek';
import { sendLowTokenEmail } from '@/lib/resend';
import {
  getOrCreateConversation,
  upsertContactContext,
  buildContactContextString,
  getRecentHistory,
  saveMessageExchange,
  saveInboundOnly,
  handleSpam,
  logCost,
} from '@/lib/messages';
import {
  loginInstagram,
  sendInstagramPrivateDM,
  getNewInstagramMessages,
  getInstagramProfilePicUrl,
} from '@/lib/instagram-private';
import {
  validateLocation,
  handleEcotrackMessage,
  buildLocationSuggestionsMsg,
  type EcotrackState,
} from '@/lib/ecotrack';
import { mirrorImageToR2 } from '@/lib/r2';

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

      // Fetch new messages — re-login if session expired
      let messages;
      try {
        messages = await getNewInstagramMessages(sessionData, afterTs);
      } catch {
        if (!connection.instagramPassword) {
          results.push({ id: connection.id, processed: 0, error: 'Session expired, no password stored' });
          continue;
        }
        const pwd = decrypt(connection.instagramPassword);
        sessionData = await loginInstagram(connection.instagramUsername!, pwd);
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
        results.push({ id: connection.id, processed: 0, error: 'User banned/not found' });
        continue;
      }

      // ── Ecotrack connection fields ─────────────────────────────────────────
      const ecoRawToken = (connection as any).ecotrackToken as string | null;
      const ecoUrl = (connection as any).ecotrackUrl as string | null;
      const ecoEnabled = !!(ecoRawToken && ecoUrl);
      const ecoDeliveryFee = (connection as any).deliveryFee as number ?? 0;

      let maxTs = afterTs;

      for (const msg of messages) {
        if (msg.timestampMicros > maxTs) maxTs = msg.timestampMicros;

        const contactId = msg.senderId;
        const text = msg.text.trim();
        if (!text) continue;

        // ── Solde ─────────────────────────────────────────────────────────────
        if (!user.unlimitedTokens && user.tokenBalance < 1) continue;

        // ── Conversation ──────────────────────────────────────────────────────
        const conversation = await getOrCreateConversation({
          connectionId: connection.id,
          contactId,
          platform: 'INSTAGRAM',
        });
        if (conversation.isSuspended) continue;

        // ── Profil photo → R2 ─────────────────────────────────────────────────
        await refreshProfilePhoto(sessionData, connection.id, contactId);

        // ── History ───────────────────────────────────────────────────────────
        const history = await getRecentHistory(conversation.id);
        const isFirstMessage = history.length === 0;

        // ── Welcome message (first ever contact) ──────────────────────────────
        if (isFirstMessage && connection.welcomeMessage) {
          await sendInstagramPrivateDM(sessionData, contactId, connection.welcomeMessage);
          await saveInboundOnly({ conversationId: conversation.id, content: text, type: 'text' });
          const ctxMeta = await getContactMeta(connection.id, contactId);
          await upsertContactContext(connection.id, contactId, { contactName: null, metadata: ctxMeta });
          continue;
        }

        // ── Confirmation reply detection ───────────────────────────────────────
        const lower = text.toLowerCase().trim();
        const isYes = /^(oui|yes|confirme|confirm|ok|d'accord|dacord|ouii|ouiii|ouais|yep|correct|exact|c'est bon|cest bon|c bon|je confirme|valide|validé|accepte|j'accepte)/.test(lower);
        const isNo  = /^(non|no|annule|cancel|annuler|pas bon|faux|incorrect|je refuse|refuse|nope|nan|naan)/.test(lower);

        if (isYes || isNo) {
          let skipConfirmation = false;
          if (ecoEnabled) {
            const ctxEco = await prisma.contactContext.findUnique({
              where: { connectionId_contactId: { connectionId: connection.id, contactId } },
              select: { metadata: true },
            });
            skipConfirmation = !!(ctxEco?.metadata as any)?.ecotrackState;
          }

          if (!skipConfirmation) {
            const pendingOrder = await prisma.order.findFirst({
              where: {
                connectionId: connection.id,
                contactId,
                status: 'PENDING',
                confirmationSentAt: { not: null },
              },
              orderBy: { confirmationSentAt: 'desc' },
            });

            if (pendingOrder) {
              let newStatus: 'CONFIRMED' | 'CANCELLED' | 'SHIPPED' = isYes ? 'CONFIRMED' : 'CANCELLED';
              let replyMsg = '';

              if (isYes) {
                const autoShip = (connection as any).ecotrackAutoShip as boolean;
                if (autoShip && ecoEnabled && pendingOrder.ecotrackTracking) {
                  try {
                    const { shipEcotrackOrder } = await import('@/lib/ecotrack');
                    const shipped = await shipEcotrackOrder(ecoUrl!, decrypt(ecoRawToken!), pendingOrder.ecotrackTracking);
                    if (shipped) {
                      newStatus = 'SHIPPED';
                      replyMsg = `✅ Commande #${pendingOrder.id.slice(-6).toUpperCase()} confirmée et expédiée ! 🚚\n📦 Tracking : ${pendingOrder.ecotrackTracking}\n\nMerci pour votre confiance ! 🎉`;
                    }
                  } catch (e) { console.error('[Instagram] Auto-ship error', e); }
                }
                if (!replyMsg) {
                  replyMsg = `✅ Votre commande #${pendingOrder.id.slice(-6).toUpperCase()} a été confirmée avec succès ! Merci pour votre confiance. 🎉`;
                  if (pendingOrder.ecotrackTracking) replyMsg += `\n📦 Tracking : ${pendingOrder.ecotrackTracking}`;
                }
              } else {
                replyMsg = `❌ Votre commande #${pendingOrder.id.slice(-6).toUpperCase()} a été annulée. N'hésitez pas à nous recontacter si vous changez d'avis.`;
                if (pendingOrder.ecotrackTracking && ecoEnabled) {
                  try {
                    const { deleteEcotrackOrder } = await import('@/lib/ecotrack');
                    await deleteEcotrackOrder(ecoUrl!, decrypt(ecoRawToken!), pendingOrder.ecotrackTracking);
                  } catch (e) { console.error('[Instagram] Delete order error', e); }
                }
              }

              await prisma.order.update({ where: { id: pendingOrder.id }, data: { status: newStatus } });
              await sendInstagramPrivateDM(sessionData, contactId, replyMsg);
              await saveInboundOnly({ conversationId: conversation.id, content: text, type: 'text' });
              const meta = await getContactMeta(connection.id, contactId);
              await upsertContactContext(connection.id, contactId, { contactName: null, metadata: meta });
              continue;
            }
          }
        }

        // ── Ecotrack state machine (intercepts mid-order flow) ─────────────────
        if (ecoEnabled) {
          const ctxForEco = await prisma.contactContext.findUnique({
            where: { connectionId_contactId: { connectionId: connection.id, contactId } },
            select: { metadata: true },
          });
          const metaForEco = (ctxForEco?.metadata as Record<string, any> | null) ?? {};
          const ecoState = metaForEco.ecotrackState as EcotrackState | undefined;

          if (ecoState) {
            const ecoToken = decrypt(ecoRawToken!);
            const result = await handleEcotrackMessage(ecoState, text, ecoToken, ecoUrl!, ecoDeliveryFee);
            if (result.handled) {
              const newMeta = { ...metaForEco, ecotrackState: result.newState ?? undefined };
              await upsertContactContext(connection.id, contactId, { contactName: null, metadata: newMeta });
              if (result.responseText) await sendInstagramPrivateDM(sessionData, contactId, result.responseText);
              await saveInboundOnly({ conversationId: conversation.id, content: text, type: 'text' });
              continue;
            }
          }
        }

        let responseText = '';
        let tokensRequired = 1;

        // ── Réponses prédéfinies (0 token) ────────────────────────────────────
        const predefined = connection.predefinedMessages.find((m) =>
          m.keywords.some((k: string) => lower.includes(k.toLowerCase()))
        );
        if (predefined) {
          responseText = predefined.response;
          tokensRequired = 0;
        }

        // ── Appel IA ──────────────────────────────────────────────────────────
        if (!responseText) {
          const contactCtx = await prisma.contactContext.findUnique({
            where: { connectionId_contactId: { connectionId: connection.id, contactId } },
          });
          const systemPrompt = await buildIgSystemPrompt(connection, buildContactContextString(contactCtx), isFirstMessage, ecoDeliveryFee);
          const aiMessages = [...history, { role: 'user' as const, content: text }];
          const rawResponse = await callDeepSeek(aiMessages, systemPrompt);

          // ── Hors sujet ─────────────────────────────────────────────────────
          if (rawResponse.startsWith('[HORS_SUJET]')) {
            responseText = rawResponse.replace('[HORS_SUJET]', '').trim();
            const blocked = await handleSpam(conversation.id);
            if (blocked) {
              await saveInboundOnly({ conversationId: conversation.id, content: text, type: 'text' });
              const meta = await getContactMeta(connection.id, contactId);
              await upsertContactContext(connection.id, contactId, { contactName: null, metadata: meta });
              if (responseText) await sendInstagramPrivateDM(sessionData, contactId, responseText);
              continue;
            }
          }
          // ── Commande annulée ───────────────────────────────────────────────
          else if (rawResponse.includes('[COMMANDE_ANNULEE]')) {
            responseText = rawResponse.replace('[COMMANDE_ANNULEE]', '').trim();
            try {
              const latestOrder = await prisma.order.findFirst({
                where: { connectionId: connection.id, contactId, status: 'PENDING' },
                orderBy: { createdAt: 'desc' },
              });
              if (latestOrder) {
                await prisma.order.update({ where: { id: latestOrder.id }, data: { status: 'CANCELLED' } });
                if (latestOrder.ecotrackTracking && ecoEnabled) {
                  try {
                    const { deleteEcotrackOrder } = await import('@/lib/ecotrack');
                    await deleteEcotrackOrder(ecoUrl!, decrypt(ecoRawToken!), latestOrder.ecotrackTracking);
                  } catch (e) { console.error('[Instagram] Ecotrack delete error', e); }
                }
              }
              if (ecoEnabled) {
                const ctxCancel = await prisma.contactContext.findUnique({
                  where: { connectionId_contactId: { connectionId: connection.id, contactId } },
                  select: { metadata: true },
                });
                if ((ctxCancel?.metadata as any)?.ecotrackState) {
                  const clearedMeta = { ...(ctxCancel!.metadata as Record<string, any>) };
                  delete clearedMeta.ecotrackState;
                  await upsertContactContext(connection.id, contactId, { contactName: null, metadata: clearedMeta });
                }
              }
            } catch (e) { console.error('[Instagram] Order cancellation error', e); }
          }
          // ── Commande modifiée ──────────────────────────────────────────────
          else if (rawResponse.includes('[COMMANDE_MODIFIEE:')) {
            const tagStart = rawResponse.indexOf('[COMMANDE_MODIFIEE:');
            const jsonStart = tagStart + '[COMMANDE_MODIFIEE:'.length;
            const tagEnd = rawResponse.lastIndexOf('}]');
            if (tagEnd > jsonStart) {
              const jsonStr = rawResponse.slice(jsonStart, tagEnd + 1);
              responseText = (rawResponse.slice(0, tagStart) + rawResponse.slice(tagEnd + 2)).trim();
              try {
                const orderData = JSON.parse(jsonStr);
                await updateOrCreateOrder(connection, contactId, null, orderData);
              } catch (e) { console.error('[Instagram] Order modify error', e); }
            } else {
              responseText = rawResponse;
            }
          }
          // ── Commande confirmée ─────────────────────────────────────────────
          else {
            const tagStart = rawResponse.indexOf('[COMMANDE_CONFIRMEE:');
            if (tagStart !== -1) {
              const jsonStart = tagStart + '[COMMANDE_CONFIRMEE:'.length;
              const tagEnd = rawResponse.lastIndexOf('}]');
              if (tagEnd > jsonStart) {
                const jsonStr = rawResponse.slice(jsonStart, tagEnd + 1);
                responseText = (rawResponse.slice(0, tagStart) + rawResponse.slice(tagEnd + 2)).trim();
                try {
                  const orderData = JSON.parse(jsonStr);
                  const recentCancelled = await prisma.order.findFirst({
                    where: {
                      connectionId: connection.id,
                      contactId,
                      status: 'CANCELLED',
                      updatedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
                    },
                    orderBy: { updatedAt: 'desc' },
                  });
                  let newOrderId: string;
                  if (recentCancelled) {
                    newOrderId = await updateOrCreateOrder(connection, contactId, null, orderData, recentCancelled.id);
                  } else {
                    newOrderId = await saveOrderFromBot(connection, contactId, null, orderData);
                  }

                  // ── Ecotrack: validate address + start delivery flow ────────
                  if (ecoEnabled && newOrderId) {
                    try {
                      const ecoToken = decrypt(ecoRawToken!);
                      const { found, suggestions } = await validateLocation(ecoUrl!, ecoToken, orderData.wilaya || '', orderData.commune || '');
                      const contactCtx = await prisma.contactContext.findUnique({
                        where: { connectionId_contactId: { connectionId: connection.id, contactId } },
                      });
                      if (found) {
                        const newState: EcotrackState = {
                          step: 'awaiting_delivery_type',
                          orderId: newOrderId,
                          orderData,
                          wilayaId: found.wilayaId,
                          wilayaName: found.wilayaName,
                          communeName: found.communeName,
                          codePostal: found.codePostal,
                          hasStopDesk: found.hasStopDesk,
                        };
                        const currMeta = (contactCtx?.metadata as Record<string, any> | null) ?? {};
                        await upsertContactContext(connection.id, contactId, { contactName: null, metadata: { ...currMeta, ecotrackState: newState } });
                        responseText = `✅ Commande enregistrée !\n\n📍 Livraison à ${found.communeName}, ${found.wilayaName}.\n\nComment souhaitez-vous recevoir votre colis ?\n1️⃣ Livraison à domicile\n${found.hasStopDesk ? '2️⃣ Retrait en Stop Desk (agence)' : '2️⃣ Stop Desk (non disponible dans cette commune)'}`;
                      } else if (suggestions.length > 0) {
                        const newState: EcotrackState = {
                          step: 'awaiting_location_confirm',
                          orderId: newOrderId,
                          orderData,
                          wilayaId: suggestions[0].wilayaId,
                          wilayaName: suggestions[0].wilayaName,
                          communeName: suggestions[0].communeName,
                          codePostal: suggestions[0].codePostal,
                          hasStopDesk: suggestions[0].hasStopDesk,
                          suggestions,
                        };
                        const currMeta = (contactCtx?.metadata as Record<string, any> | null) ?? {};
                        await upsertContactContext(connection.id, contactId, { contactName: null, metadata: { ...currMeta, ecotrackState: newState } });
                        responseText = buildLocationSuggestionsMsg(suggestions, orderData.commune || '', orderData.wilaya || '');
                      }
                    } catch (ecoErr) {
                      console.error('[Instagram][Ecotrack] Location validation error', ecoErr);
                    }
                  }
                } catch (e) { console.error('[Instagram] Order parse error', e); }
              } else {
                responseText = rawResponse;
              }
            } else if (!rawResponse.startsWith('[HORS_SUJET]')) {
              responseText = rawResponse;
            }
          }

          // ── Statut de commande [ORDER_STATUS_QUERY] ────────────────────────
          if (responseText.includes('[ORDER_STATUS_QUERY]')) {
            responseText = responseText.replace('[ORDER_STATUS_QUERY]', '').trim();
            try {
              const latestOrder = await prisma.order.findFirst({
                where: { connectionId: connection.id, contactId },
                orderBy: { createdAt: 'desc' },
                select: { id: true, status: true, trackingCode: true, ecotrackTracking: true, totalAmount: true, createdAt: true },
              });
              if (latestOrder) {
                const statusLabels: Record<string, string> = {
                  PENDING: '⏳ En attente de confirmation',
                  CONFIRMED: '✅ Confirmée',
                  PROCESSING: '🔄 En cours de traitement',
                  SHIPPED: '🚚 Expédiée',
                  DELIVERED: '📦 Livrée',
                  CANCELLED: '❌ Annulée',
                  RETURNED: '↩️ Retournée',
                };
                const tracking = latestOrder.ecotrackTracking || latestOrder.trackingCode;
                responseText = `📦 Commande #${latestOrder.id.slice(-6).toUpperCase()}\n` +
                  `Statut : ${statusLabels[latestOrder.status] || latestOrder.status}\n` +
                  (tracking ? `Tracking : ${tracking}\n` : '') +
                  (latestOrder.totalAmount ? `Total : ${latestOrder.totalAmount.toLocaleString('fr-DZ')} DA\n` : '') +
                  `Date : ${latestOrder.createdAt.toLocaleDateString('fr-DZ')}`;
              } else {
                responseText = `Aucune commande trouvée pour votre compte.`;
              }
            } catch (e) { console.error('[Instagram][ORDER_STATUS] Error', e); }
          }
        }

        if (!responseText) continue;

        // ── Facturer API cost ─────────────────────────────────────────────────
        if (tokensRequired > 0) logCost(user.id, 'deepseek_text');

        // ── Débiter tokens ────────────────────────────────────────────────────
        if (tokensRequired > 0 && !user.unlimitedTokens) {
          let newBalance: number;
          try {
            const updated = await prisma.user.update({
              where: { id: connection.userId, tokenBalance: { gte: tokensRequired } },
              data: { tokenBalance: { decrement: tokensRequired } },
              select: { tokenBalance: true },
            });
            newBalance = updated.tokenBalance;
          } catch {
            continue;
          }
          await prisma.tokenTransaction.create({
            data: {
              userId: connection.userId,
              type: 'USAGE',
              amount: -tokensRequired,
              balance: newBalance,
              description: 'Instagram DM',
            },
          });
          if (newBalance <= 100) {
            const fresh = await prisma.user.findUnique({
              where: { id: connection.userId },
              select: { lowTokenAlertSent: true, email: true, name: true },
            });
            if (fresh && !fresh.lowTokenAlertSent) {
              await prisma.user.update({ where: { id: connection.userId }, data: { lowTokenAlertSent: true } });
              try { await sendLowTokenEmail(fresh.email, fresh.name ?? '', newBalance); } catch {}
            }
          }
        }

        // ── Envoyer réponse ────────────────────────────────────────────────────
        await sendInstagramPrivateDM(sessionData, contactId, responseText);

        // ── Sauvegarder ────────────────────────────────────────────────────────
        await saveMessageExchange({
          conversationId: conversation.id,
          inbound: { content: text, type: 'text', tokensUsed: tokensRequired },
          outbound: { content: responseText },
        });
        const meta = await getContactMeta(connection.id, contactId);
        await upsertContactContext(connection.id, contactId, { contactName: null, metadata: meta });

        processed++;
      }

      // Mettre à jour le timestamp du dernier message
      if (maxTs > afterTs) {
        await prisma.connection.update({
          where: { id: connection.id },
          data: { instagramLastMessageTs: maxTs },
        });
      }

      results.push({ id: connection.id, processed });
    } catch (err) {
      console.error(`[Instagram cron] ${connection.id}:`, err);
      results.push({ id: connection.id, processed, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, results });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function refreshProfilePhoto(
  sessionData: string,
  connectionId: string,
  contactId: string
): Promise<void> {
  try {
    const existing = await prisma.contactContext.findUnique({
      where: { connectionId_contactId: { connectionId, contactId } },
      select: { metadata: true },
    });
    const meta = (existing?.metadata as Record<string, unknown> | null) ?? {};
    const lastFetch = meta.lastPhotoFetch ? Number(meta.lastPhotoFetch) : 0;
    const oneDay = 24 * 60 * 60 * 1000;
    if (Date.now() - lastFetch < oneDay && meta.profilePhotoUrl) return;

    const picUrl = await getInstagramProfilePicUrl(sessionData, contactId);
    if (!picUrl) return;

    const r2Key = `avatars/ig_${contactId}.jpg`;
    const r2Url = await mirrorImageToR2(picUrl, r2Key);

    await prisma.contactContext.upsert({
      where: { connectionId_contactId: { connectionId, contactId } },
      update: { metadata: { ...(meta as object), profilePhotoUrl: r2Url ?? picUrl, lastPhotoFetch: Date.now() } },
      create: { connectionId, contactId, metadata: { profilePhotoUrl: r2Url ?? picUrl, lastPhotoFetch: Date.now() } },
    });
  } catch (e) {
    console.error('[Instagram] Profile photo refresh error:', e);
  }
}

async function getContactMeta(connectionId: string, contactId: string): Promise<Record<string, unknown>> {
  const ctx = await prisma.contactContext.findUnique({
    where: { connectionId_contactId: { connectionId, contactId } },
    select: { metadata: true },
  });
  return (ctx?.metadata as Record<string, unknown> | null) ?? {};
}

async function buildIgSystemPrompt(connection: any, contactContext: string, isFirstMessage: boolean, deliveryFee = 0): Promise<string> {
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
    deliveryFee,
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

async function saveOrderFromBot(connection: any, contactId: string, contactName: string | null, data: any): Promise<string> {
  const allProducts = await prisma.product.findMany({
    where: { userId: connection.userId, isActive: true },
    select: { id: true, name: true, price: true },
  });

  const items = (data.produits || []).map((item: any) => {
    const itemNameLower = (item.nom ?? '').toLowerCase();
    let found = allProducts.find((p) => p.name.toLowerCase() === itemNameLower);
    if (!found && itemNameLower.length >= 4) {
      found = allProducts.find(
        (p) => p.name.toLowerCase().includes(itemNameLower) ||
          (p.name.length >= 4 && itemNameLower.includes(p.name.toLowerCase()))
      );
    }
    return { name: item.nom || 'Produit', quantity: item.quantite || 1, price: found?.price || item.prix || 0, productId: found?.id || null };
  });

  const total = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const fullName = [data.prenom, data.nom].filter(Boolean).join(' ') || contactName || 'Client';
  const notes = `Wilaya: ${data.wilaya || ''} — Commune: ${data.commune || ''}`;

  const autoConfirmDelay = (connection.autoConfirmDelay ?? 0) as number;
  const scheduledConfirmAt = autoConfirmDelay > 0
    ? new Date(Date.now() + autoConfirmDelay * 60 * 60 * 1000)
    : null;

  const order = await prisma.order.create({
    data: {
      userId: connection.userId,
      connectionId: connection.id,
      contactName: fullName,
      contactId,
      contactPhone: data.telephone || null,
      totalAmount: total,
      notes,
      ...(scheduledConfirmAt ? { scheduledConfirmAt } : {}),
      items: { create: items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price, ...(i.productId ? { productId: i.productId } : {}) })) },
    },
  });

  console.log(`[Instagram] Order saved: ${order.id} for ${fullName}${scheduledConfirmAt ? ` — auto-confirm at ${scheduledConfirmAt.toISOString()}` : ''}`);
  return order.id;
}

async function updateOrCreateOrder(connection: any, contactId: string, contactName: string | null, data: any, existingOrderId?: string): Promise<string> {
  const allProducts = await prisma.product.findMany({
    where: { userId: connection.userId, isActive: true },
    select: { id: true, name: true, price: true },
  });

  const items = (data.produits || []).map((item: any) => {
    const lower = (item.nom ?? '').toLowerCase();
    let found = allProducts.find((p) => p.name.toLowerCase() === lower);
    if (!found && lower.length >= 4) {
      found = allProducts.find((p) => p.name.toLowerCase().includes(lower) || (p.name.length >= 4 && lower.includes(p.name.toLowerCase())));
    }
    return { name: item.nom || 'Produit', quantity: item.quantite || 1, price: found?.price || item.prix || 0, productId: found?.id || null };
  });

  const total = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
  const fullName = [data.prenom, data.nom].filter(Boolean).join(' ') || contactName || 'Client';
  const notes = `Wilaya: ${data.wilaya || ''} — Commune: ${data.commune || ''}`;

  if (existingOrderId) {
    await prisma.orderItem.deleteMany({ where: { orderId: existingOrderId } });
    await prisma.order.update({
      where: { id: existingOrderId },
      data: { contactName: fullName, contactPhone: data.telephone || null, totalAmount: total, notes, status: 'PENDING', items: { create: items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price, ...(i.productId ? { productId: i.productId } : {}) })) } },
    });
    return existingOrderId;
  } else {
    const latest = await prisma.order.findFirst({ where: { connectionId: connection.id, contactId, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
    if (latest) {
      await prisma.orderItem.deleteMany({ where: { orderId: latest.id } });
      await prisma.order.update({ where: { id: latest.id }, data: { contactName: fullName, contactPhone: data.telephone || null, totalAmount: total, notes, items: { create: items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price, ...(i.productId ? { productId: i.productId } : {}) })) } } });
      return latest.id;
    } else {
      return saveOrderFromBot(connection, contactId, contactName, data);
    }
  }
}
