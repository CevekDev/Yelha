import OpenAI from 'openai';
import FormData from 'form-data';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  // Normalize mime type — WhatsApp sends "audio/ogg; codecs=opus"
  const baseMime = mimeType.split(';')[0].trim();
  const allowedMimeTypes = ['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm'];
  if (!allowedMimeTypes.includes(baseMime)) {
    throw new Error('Invalid audio MIME type');
  }
  mimeType = baseMime;

  if (audioBuffer.length > 10 * 1024 * 1024) {
    throw new Error('Audio file too large (max 10MB)');
  }

  const extension = mimeType === 'audio/ogg' ? 'ogg' :
                    mimeType === 'audio/mpeg' ? 'mp3' :
                    mimeType === 'audio/mp4' ? 'mp4' :
                    mimeType === 'audio/wav' ? 'wav' : 'webm';

  const file = new File([new Uint8Array(audioBuffer)], `audio.${extension}`, { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });

  return transcription.text;
}
