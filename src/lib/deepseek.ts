const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callDeepSeek(
  messages: DeepSeekMessage[],
  systemPrompt: string
): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export function buildSystemPrompt(params: {
  botName: string;
  businessName: string;
  botPersonality: any;
  predefinedResponses: string;
  customInstructions: string;
  globalPrompt: string;
}): string {
  const {
    botName,
    businessName,
    botPersonality,
    predefinedResponses,
    customInstructions,
    globalPrompt,
  } = params;

  let personalityDesc = '';
  if (botPersonality) {
    const { formality, friendliness, responseLength, emojiUsage } = botPersonality;
    if (formality <= 3) personalityDesc += 'Be casual and relaxed in your tone. ';
    else if (formality >= 8) personalityDesc += 'Be formal and professional. ';
    if (friendliness >= 8) personalityDesc += 'Be very warm, friendly and empathetic. ';
    if (responseLength <= 3) personalityDesc += 'Keep responses very brief and concise. ';
    else if (responseLength >= 8) personalityDesc += 'Give detailed and comprehensive responses. ';
    if (emojiUsage >= 7) personalityDesc += 'Use emojis frequently to make responses engaging. ';
    else if (emojiUsage <= 2) personalityDesc += 'Avoid using emojis. ';
  }

  return globalPrompt
    .replace('{botName}', botName)
    .replace('{businessName}', businessName)
    .replace('{botPersonality}', personalityDesc)
    .replace('{predefinedResponses}', predefinedResponses || 'None')
    .replace('{customInstructions}', customInstructions || 'None');
}
