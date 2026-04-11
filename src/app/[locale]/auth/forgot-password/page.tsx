'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Loader2, Mail, CheckCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PasswordStrength } from '@/components/auth/password-strength';

const ORANGE = '#FF6B2C';

type Step = 'email' | 'code' | 'success';

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeInput = (idx: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = digit;
    setCode(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleCodeKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const sendCode = async (isResend = false) => {
    if (!email) return;
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      if (!isResend) {
        setStep('code');
        setResendCooldown(60);
      } else {
        setResendCooldown(60);
        toast({ title: 'Code renvoyé !', description: 'Vérifiez votre boîte mail.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await sendCode(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length < 6) return;
    if (password !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas.', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Erreur', description: 'Le mot de passe doit contenir au moins 8 caractères.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode, password }),
      });
      if (res.ok) {
        setStep('success');
        setTimeout(() => router.push(`/${locale}/auth/signin`), 3000);
      } else {
        const data = await res.json();
        toast({ title: 'Erreur', description: data.error || 'Code invalide ou expiré.', variant: 'destructive' });
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step: success ──
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{ background: '#10B98120', border: '2px solid #10B981' }}>
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="font-mono font-bold text-white text-2xl">Mot de passe modifié !</h2>
          <p className="font-mono text-white/40 text-sm">Redirection vers la connexion...</p>
          <Loader2 className="w-5 h-5 text-white/20 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-md">
        <div className="bg-[#0D0D10] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">

          {/* Icon + title */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: `${ORANGE}15`, border: `1px solid ${ORANGE}30` }}>
              {step === 'email'
                ? <Mail className="w-8 h-8" style={{ color: ORANGE }} />
                : <KeyRound className="w-8 h-8" style={{ color: ORANGE }} />}
            </div>
            <h1 className="font-mono font-bold text-white text-xl mb-2">
              {step === 'email' ? 'Mot de passe oublié' : 'Nouveau mot de passe'}
            </h1>
            <p className="font-mono text-white/40 text-sm leading-relaxed">
              {step === 'email'
                ? 'Entrez votre email pour recevoir un code de réinitialisation.'
                : <>Code envoyé à <span style={{ color: ORANGE }}>{email}</span></>}
            </p>
          </div>

          {/* ── STEP 1: Email ── */}
          {step === 'email' && (
            <form onSubmit={handleSubmitEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-white/50 mb-1.5">
                  Email <span style={{ color: ORANGE }}>*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-orange-500/40"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 rounded-xl font-mono text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: ORANGE }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Envoyer le code
              </button>
            </form>
          )}

          {/* ── STEP 2: Code + new password ── */}
          {step === 'code' && (
            <form onSubmit={handleReset} className="space-y-5">
              {/* 6-digit code */}
              <div>
                <label className="block text-xs font-mono text-white/50 mb-2 text-center">Code de vérification</label>
                <div className="flex justify-center gap-2.5" onPaste={handleCodePaste}>
                  {code.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleCodeInput(idx, e.target.value)}
                      onKeyDown={e => handleCodeKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-2xl font-mono font-bold text-white rounded-xl transition-all outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: digit ? `2px solid ${ORANGE}` : '2px solid rgba(255,255,255,0.08)',
                        caretColor: ORANGE,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="block text-xs font-mono text-white/50 mb-1.5">
                  Nouveau mot de passe <span style={{ color: ORANGE }}>*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-orange-500/40"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-white/30 hover:text-white/60">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-xs font-mono text-white/50 mb-1.5">
                  Confirmer le mot de passe <span style={{ color: ORANGE }}>*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-orange-500/40"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-white/30 hover:text-white/60">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-400 mt-1 font-mono">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || code.join('').length < 6 || !password || password !== confirmPassword}
                className="w-full py-3 rounded-xl font-mono text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: ORANGE }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Réinitialiser le mot de passe
              </button>

              {/* Resend code */}
              <button
                type="button"
                onClick={() => sendCode(true)}
                disabled={loading || resendCooldown > 0}
                className="w-full py-2 font-mono text-xs text-white/30 hover:text-white/60 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Renvoyer le code'}
              </button>
            </form>
          )}

          {/* Back to login */}
          <div className="mt-6 text-center">
            <Link
              href={`/${locale}/auth/signin`}
              className="font-mono text-xs text-white/30 hover:text-white/60 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
