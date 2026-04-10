import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { z } from 'zod';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

const schema = z.object({
  targetType: z.enum(['all', 'user']),
  userId: z.string().optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { targetType, userId, subject, message } = parsed.data;

  let recipients: { email: string; name: string | null }[] = [];

  if (targetType === 'all') {
    recipients = await prisma.user.findMany({
      where: { role: 'USER', emailVerified: { not: null } },
      select: { email: true, name: true },
    });
  } else {
    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    recipients = [user];
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: 'Aucun destinataire trouvé' }, { status: 400 });
  }

  // Send emails (batch to avoid rate limits)
  const results = await Promise.allSettled(
    recipients.map(r =>
      resend.emails.send({
        from: `Yelha <${FROM}>`,
        to: r.email,
        subject,
        html: `
          <div style="font-family:monospace;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
            <div style="margin-bottom:24px;">
              <span style="background:#FF6B2C;color:#fff;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;">Yelha</span>
            </div>
            <h2 style="color:#fff;margin-bottom:16px;">${subject}</h2>
            <div style="color:rgba(255,255,255,0.7);line-height:1.7;white-space:pre-wrap;">${message}</div>
            <hr style="border-color:rgba(255,255,255,0.1);margin:32px 0;" />
            <p style="color:rgba(255,255,255,0.3);font-size:11px;">© 2025 Yelha — mehdimerah06.pro@gmail.com</p>
          </div>
        `,
      })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return NextResponse.json({ success: true, sent, failed, total: recipients.length });
}
