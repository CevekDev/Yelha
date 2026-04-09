import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { callDeepSeek, buildSystemPrompt } from '@/lib/deepseek';
import { transcribeAudio } from '@/lib/whisper';

export async function POST(req: NextRequest, { params }: { params: { connectionId: string } }) {
  const body = await req.json();

  const connection = await prisma.connection.findFirst({
    where: { id: params.connectionId, platform: 'TELEGRAM', isActive: true },
    include: { predefinedMessages: { where: { isActive: true }, orderBy: { priority: 'asc' } } },
  });

  if (!connection || !connection.telegramBotToken) {
    return NextResponse.json({ ok: true });
  }

  const token = decrypt(connection.telegramBotToken);
  const message = body.message || body.callback_query?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId = message.chat.id;
  const text = message.text || '';
  const user = await prisma.user.findUnique({ where: { id: connection.userId } });
  if (!user) return NextResponse.json({ ok: true });

  // Handle /start command
  if (text === '/start' && connection.welcomeMessage) {
    await sendTelegramMessage(token, chatId, connection.welcomeMessage);
    return NextResponse.json({ ok: true });
  }

  let responseText = '';
  let tokensRequired = 1;

  if (message.voice) {
    tokensRequired = 2;
    if (user.tokenBalance < 2) {
      await sendTelegramMessage(token, chatId, 'Insufficient token balance.');
      return NextResponse.json({ ok: true });
    }
    // Download and transcribe voice
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${message.voice.file_id}`);
    const fileData = await fileRes.json();
    const filePath = fileData.result.file_path;
    const audioRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    const transcript = await transcribeAudio(audioBuffer, 'audio/ogg');
    if (transcript) {
      const systemPrompt = await buildTelegramSystemPrompt(connection);
      responseText = await callDeepSeek([{ role: 'user', content: `[Voice]: ${transcript}` }], systemPrompt);
    }
  } else if (message.photo) {
    if (user.tokenBalance < 1) return NextResponse.json({ ok: true });
    const systemPrompt = await buildTelegramSystemPrompt(connection);
    responseText = await callDeepSeek([{ role: 'user', content: '[Image received]' }], systemPrompt);
  } else if (text) {
    // Check predefined messages
    const lower = text.toLowerCase();
    const predefined = connection.predefinedMessages.find(m =>
      m.keywords.some(k => lower.includes(k.toLowerCase()))
    );
    if (predefined) {
      responseText = predefined.response;
      tokensRequired = 0;
    } else {
      if (user.tokenBalance < 1) {
        await sendTelegramMessage(token, chatId, 'Insufficient token balance.');
        return NextResponse.json({ ok: true });
      }
      const systemPrompt = await buildTelegramSystemPrompt(connection);
      responseText = await callDeepSeek([{ role: 'user', content: text }], systemPrompt);
    }
  }

  if (!responseText) return NextResponse.json({ ok: true });

  if (tokensRequired > 0) {
    const updated = await prisma.user.updateMany({
      where: { id: connection.userId, tokenBalance: { gte: tokensRequired } },
      data: { tokenBalance: { decrement: tokensRequired } },
    });
    if (updated.count === 0) return NextResponse.json({ ok: true });

    const newUser = await prisma.user.findUnique({ where: { id: connection.userId } });
    await prisma.tokenTransaction.create({
      data: {
        userId: connection.userId,
        type: 'USAGE',
        amount: -tokensRequired,
        balance: newUser!.tokenBalance,
        description: 'Telegram message processed',
      },
    });
  }

  await sendTelegramMessage(token, chatId, responseText);
  return NextResponse.json({ ok: true });
}

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

async function buildTelegramSystemPrompt(connection: any): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'global_system_prompt' } });
  const globalPrompt = setting?.value || getDefaultPrompt();
  const predefinedStr = connection.predefinedMessages
    .map((m: any) => `Keywords: ${m.keywords.join(', ')}\nResponse: ${m.response}`)
    .join('\n---\n');
  return buildSystemPrompt({
    botName: connection.botName || 'Assistant',
    businessName: connection.businessName || '',
    botPersonality: connection.botPersonality,
    predefinedResponses: predefinedStr,
    customInstructions: connection.customInstructions || '',
    globalPrompt,
  });
}

function getDefaultPrompt(): string {
  return `You are {botName}, an assistant for {businessName}. {botPersonality}
Detect user language and reply in same language. PREDEFINED RESPONSES: {predefinedResponses}
CUSTOM INSTRUCTIONS: {customInstructions}`;
}
