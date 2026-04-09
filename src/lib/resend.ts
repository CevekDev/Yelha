import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@aireply.app';

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
  locale: string = 'fr'
) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/auth/verify-email?token=${token}`;

  const subjects: Record<string, string> = {
    fr: 'Vérifiez votre adresse email',
    en: 'Verify your email address',
    ar: 'تحقق من عنوان بريدك الإلكتروني',
  };

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: subjects[locale] || subjects.fr,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${locale === 'ar' ? 'مرحباً' : locale === 'en' ? 'Hello' : 'Bonjour'} ${name},</h2>
        <p>${locale === 'ar' ? 'انقر على الرابط أدناه للتحقق من بريدك الإلكتروني:' :
           locale === 'en' ? 'Click the link below to verify your email:' :
           'Cliquez sur le lien ci-dessous pour vérifier votre email:'}</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          ${locale === 'ar' ? 'تحقق من البريد الإلكتروني' : locale === 'en' ? 'Verify Email' : 'Vérifier mon email'}
        </a>
        <p style="color: #666; font-size: 14px;">
          ${locale === 'ar' ? 'هذا الرابط صالح لمدة 24 ساعة.' :
           locale === 'en' ? 'This link expires in 24 hours.' :
           'Ce lien expire dans 24 heures.'}
        </p>
      </div>
    `,
  });
}

export async function sendTokenPurchaseEmail(
  email: string,
  name: string,
  tokens: number,
  amountDZD: number
) {
  const formattedAmount = amountDZD.toLocaleString('fr-FR') + ' DA';

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Confirmation d'achat — ${tokens.toLocaleString()} tokens AiReply`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 24px; border-radius: 8px;">
        <div style="background: #6366f1; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">AiReply</h1>
        </div>
        <div style="background: white; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
          <h2 style="color: #111827;">Bonjour ${name},</h2>
          <p style="color: #374151;">Votre achat a bien été effectué. Vos tokens ont été ajoutés à votre compte.</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Tokens achetés</p>
            <p style="margin: 8px 0 0; font-size: 36px; font-weight: 700; color: #6366f1;">${tokens.toLocaleString()}</p>
            <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Montant payé : <strong>${formattedAmount}</strong></p>
          </div>
          <p style="color: #374151;">Connectez-vous à votre tableau de bord pour commencer à utiliser vos tokens.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/fr/dashboard/tokens"
             style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Voir mon solde
          </a>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Si vous n'avez pas effectué cet achat, contactez notre support.</p>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string,
  locale: string = 'fr'
) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/auth/reset-password?token=${token}`;

  const subjects: Record<string, string> = {
    fr: 'Réinitialisez votre mot de passe',
    en: 'Reset your password',
    ar: 'إعادة تعيين كلمة المرور',
  };

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: subjects[locale] || subjects.fr,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${locale === 'ar' ? 'مرحباً' : locale === 'en' ? 'Hello' : 'Bonjour'} ${name},</h2>
        <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">
          ${locale === 'ar' ? 'إعادة تعيين كلمة المرور' : locale === 'en' ? 'Reset Password' : 'Réinitialiser le mot de passe'}
        </a>
        <p style="color: #666; font-size: 14px;">
          ${locale === 'ar' ? 'هذا الرابط صالح لمدة 15 دقيقة فقط.' :
           locale === 'en' ? 'This link expires in 15 minutes.' :
           'Ce lien expire dans 15 minutes.'}
        </p>
      </div>
    `,
  });
}
