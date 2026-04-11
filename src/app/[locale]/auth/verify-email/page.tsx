'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { signIn } from 'next-auth/react';

const ORANGE = '#FF6B2C';

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const { toast } = useToast();

  const email = searchParams.get('email') || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInput = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length < 6) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode, email }),
      });
      if (res.ok) {
        const data = await res.json();
        setVerified(true);
        // Auto-login with the one-time token
        const result = await signIn('credentials', {
          email,
          autoLoginToken: data.autoLoginToken,
          redirect: false,
        });
        if (result?.ok) {
          router.push(`/${locale}/dashboard`);
        } else {
          // Fallback to signin page if auto-login fails
          router.push(`/${locale}/auth/signin`);
        }
      } else {
        const data = await res.json();
        toast({
          title: tCommon('error'),
          description: data.error || 'Code invalide',
          variant: 'destructive',
        });
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendCooldown(60);
      toast({ title: tCommon('success'), description: 'Nouveau code envoyé !' });
    } finally {
      setResendLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="text-center space-y-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ background: '#10B98120', border: '2px solid #10B981' }}
          >
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="font-mono font-bold text-white text-2xl">Email vérifié !</h2>
          <p className="font-mono text-white/40 text-sm">Connexion en cours...</p>
          <Loader2 className="w-5 h-5 text-white/20 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-md">
        <div className="bg-[#0D0D10] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}30` }}
            >
              <Mail className="w-8 h-8" style={{ color: ORANGE }} />
            </div>
            <h1 className="font-mono font-bold text-white text-xl mb-2">Vérifiez votre email</h1>
            <p className="font-mono text-white/40 text-sm leading-relaxed">
              Un code à 6 chiffres a été envoyé à
            </p>
            {email && (
              <p className="font-mono text-sm mt-1 font-semibold" style={{ color: ORANGE }}>
                {email}
              </p>
            )}
          </div>

          {/* Code input */}
          <div className="flex justify-center gap-2.5 mb-6" onPaste={handlePaste}>
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleInput(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className="w-12 h-14 text-center text-2xl font-mono font-bold text-white rounded-xl transition-all outline-none"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: digit ? `2px solid ${ORANGE}` : '2px solid rgba(255,255,255,0.08)',
                  caretColor: ORANGE,
                }}
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || code.join('').length < 6}
            className="w-full py-3 rounded-xl font-mono text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 mb-4"
            style={{ background: ORANGE }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Vérifier et se connecter
          </button>

          <button
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
            className="w-full py-2.5 rounded-xl font-mono text-xs text-white/40 hover:text-white/70 transition-colors flex items-center justify-center gap-2"
          >
            {resendLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Renvoyer le code'}
          </button>
        </div>
      </div>
    </div>
  );
}
