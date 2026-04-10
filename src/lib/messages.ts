import { prisma } from '@/lib/prisma';

/** Nombre max de messages conservés par conversation */
const MAX_MESSAGES = 100;

/** Nombre de messages d'historique passés à l'IA */
const HISTORY_MESSAGES = 20;

/**
 * Supprime les messages les plus anciens si la conversation dépasse MAX_MESSAGES.
 * Appelé après chaque sauvegarde de message.
 */
export async function pruneMessages(conversationId: string): Promise<void> {
  const count = await prisma.message.count({ where: { conversationId } });
  if (count <= MAX_MESSAGES) return;

  const excess = count - MAX_MESSAGES;
  const oldest = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: excess,
    select: { id: true },
  });

  if (oldest.length > 0) {
    await prisma.message.deleteMany({
      where: { id: { in: oldest.map((m) => m.id) } },
    });
  }
}

/**
 * Récupère ou crée un ContactContext pour un contact donné.
 */
export async function upsertContactContext(
  connectionId: string,
  contactId: string,
  update: {
    contactName?: string | null;
    wilaya?: string | null;
    notes?: string | null;
    metadata?: Record<string, any> | null;
  } = {}
) {
  // Filtrer les valeurs undefined pour ne pas écraser des données existantes
  const cleanUpdate = Object.fromEntries(
    Object.entries(update).filter(([, v]) => v !== undefined)
  );

  return prisma.contactContext.upsert({
    where: { connectionId_contactId: { connectionId, contactId } },
    create: {
      connectionId,
      contactId,
      ...cleanUpdate,
      lastSeenAt: new Date(),
    },
    update: {
      ...cleanUpdate,
      lastSeenAt: new Date(),
    },
  });
}

/**
 * Construit la chaîne de contexte client à injecter dans le system prompt.
 */
export function buildContactContextString(ctx: {
  contactName?: string | null;
  wilaya?: string | null;
  notes?: string | null;
  metadata?: any;
} | null): string {
  if (!ctx) return '';
  const lines: string[] = [];
  if (ctx.contactName) lines.push(`- Prénom/Nom client : ${ctx.contactName}`);
  if (ctx.wilaya) lines.push(`- Wilaya : ${ctx.wilaya}`);
  if (ctx.notes) lines.push(`- Notes : ${ctx.notes}`);
  if (ctx.metadata && Object.keys(ctx.metadata).length > 0) {
    for (const [k, v] of Object.entries(ctx.metadata)) {
      lines.push(`- ${k} : ${v}`);
    }
  }
  if (lines.length === 0) return '';
  return `\n\n[CONTEXTE CLIENT]\n${lines.join('\n')}`;
}

/**
 * Récupère les N derniers messages d'une conversation pour l'historique IA.
 */
export async function getRecentHistory(
  conversationId: string
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_MESSAGES,
    select: { direction: true, content: true },
  });

  // Inverser pour ordre chronologique et mapper vers format DeepSeek
  return messages
    .reverse()
    .map((m) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
    }));
}

/**
 * Sauvegarde un échange (inbound + outbound) et élaguer si nécessaire.
 */
export async function saveMessageExchange(opts: {
  conversationId: string;
  inbound: { content: string; type: string; tokensUsed: number };
  outbound: { content: string };
}): Promise<void> {
  const { conversationId, inbound, outbound } = opts;

  await prisma.message.createMany({
    data: [
      {
        conversationId,
        direction: 'inbound',
        content: inbound.content,
        type: inbound.type,
        tokensUsed: inbound.tokensUsed,
      },
      {
        conversationId,
        direction: 'outbound',
        content: outbound.content,
        type: 'text',
        tokensUsed: 0,
      },
    ],
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessage: new Date(), isNew: false },
  });

  // Élagage asynchrone — ne bloque pas la réponse
  pruneMessages(conversationId).catch(console.error);
}

/**
 * Récupère ou crée une conversation pour un contact.
 */
export async function getOrCreateConversation(opts: {
  connectionId: string;
  contactId: string;
  platform: 'TELEGRAM' | 'WHATSAPP';
  contactName?: string | null;
}) {
  const { connectionId, contactId, platform, contactName } = opts;

  let conversation = await prisma.conversation.findFirst({
    where: { connectionId, contactId },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        connectionId,
        externalId: contactId,
        platform,
        contactId,
        contactName: contactName || null,
      },
    });
  } else if (contactName && !conversation.contactName) {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { contactName },
    });
  }

  return conversation;
}
