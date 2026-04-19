import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { sendMessengerMessage } from '@/lib/messenger';

const WA_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL!;
const WA_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET!;

async function sendViaRailway(connectionId: string, contactId: string, message: string) {
  const res = await fetch(`${WA_SERVICE_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-whatsapp-secret': WA_SERVICE_SECRET },
    body: JSON.stringify({ connectionId, contactId, message }),
  });
  if (!res.ok) throw new Error(`Railway send failed: ${res.status}`);
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  const dueOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING',
      scheduledConfirmAt: { lte: now },
      confirmationSentAt: null,
      contactId: { not: null },
    },
    include: {
      connection: {
        select: {
          id: true,
          telegramBotToken: true,
          whatsappPhoneNumberId: true,
          whatsappAccessToken: true,
          messengerAccessToken: true,
          platform: true,
        },
      },
    },
    take: 50,
  });

  let sent = 0;
  for (const order of dueOrders) {
    if (!order.contactId) continue;
    const { platform } = order.connection;

    const orderRef = `#${order.id.slice(-6).toUpperCase()}`;
    const plainMsg =
      `✅ Confirmation de votre commande ${orderRef}\n\n` +
      (order.contactName ? `👤 Nom : ${order.contactName}\n` : '') +
      (order.contactPhone ? `📞 Téléphone : ${order.contactPhone}\n` : '') +
      (order.notes ? `📍 Adresse : ${order.notes}\n` : '') +
      ((order as any).ecotrackTracking ? `📦 Tracking : ${(order as any).ecotrackTracking}\n` : '') +
      `\n` +
      (order.totalAmount ? `💰 Total : ${order.totalAmount.toLocaleString('fr-DZ')} DA\n\n` : '') +
      `Veuillez confirmer que ces informations sont correctes en répondant OUI ou signalez une correction.`;

    const htmlMsg =
      `✅ <b>Confirmation de votre commande ${orderRef}</b>\n\n` +
      (order.contactName ? `👤 Nom : ${order.contactName}\n` : '') +
      (order.contactPhone ? `📞 Téléphone : ${order.contactPhone}\n` : '') +
      (order.notes ? `📍 Adresse : ${order.notes}\n` : '') +
      ((order as any).ecotrackTracking ? `📦 Tracking : <b>${(order as any).ecotrackTracking}</b>\n` : '') +
      `\n` +
      (order.totalAmount ? `💰 Total : <b>${order.totalAmount.toLocaleString('fr-DZ')} DA</b>\n\n` : '') +
      `Veuillez confirmer que ces informations sont correctes en répondant <b>OUI</b> ou signalez une correction.`;

    try {
      if (platform === 'TELEGRAM') {
        if (!order.connection.telegramBotToken) continue;
        const token = decrypt(order.connection.telegramBotToken);
        await sendTelegramMessage(token, order.contactId, htmlMsg);
      } else if (platform === 'WHATSAPP') {
        if (order.connection.whatsappPhoneNumberId && order.connection.whatsappAccessToken) {
          // Meta WhatsApp API
          const token = decrypt(order.connection.whatsappAccessToken);
          await sendWhatsAppMessage(order.connection.whatsappPhoneNumberId, token, order.contactId, plainMsg);
        } else if (WA_SERVICE_URL && WA_SERVICE_SECRET) {
          // WhatsApp Web.js via Railway
          await sendViaRailway(order.connection.id, order.contactId, plainMsg);
        } else {
          continue;
        }
      } else if (platform === 'FACEBOOK') {
        if (!order.connection.messengerAccessToken) continue;
        const token = decrypt(order.connection.messengerAccessToken);
        await sendMessengerMessage(token, order.contactId, plainMsg);
      } else {
        continue;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { confirmationSentAt: now, scheduledConfirmAt: null },
      });
      sent++;
    } catch (e) {
      console.error(`[AutoConfirm] Error for order ${order.id}`, e);
    }
  }

  return NextResponse.json({ processed: dueOrders.length, sent });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
