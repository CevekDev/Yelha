'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Loader2, Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const { toast } = useToast();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const verifyToken = async (tok: string) => {
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok }),
      });
      if (res.ok) {
        setVerified(true);
        setTimeout(() => router.push(`/${locale}/auth/signin`), 3000);
      } else {
        toast({ title: tCommon('error'), description: 'Invalid or expired verification link.', variant: 'destructive' });
      }
    } finally {
      setVerifying(false);
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
      toast({ title: tCommon('success'), description: 'Verification email sent!' });
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {verified ? (
              <CheckCircle className="w-16 h-16 text-green-500" />
            ) : verifying ? (
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
            ) : (
              <Mail className="w-16 h-16 text-primary" />
            )}
          </div>
          <CardTitle>{verified ? 'Email Verified!' : t('verifyEmail')}</CardTitle>
          <CardDescription>
            {verified
              ? 'Your email has been verified. Redirecting to sign in...'
              : t('verifyEmailDesc')}
          </CardDescription>
        </CardHeader>
        {!verified && !verifying && !token && (
          <CardContent>
            <Button
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
              variant="outline"
              className="w-full"
            >
              {resendLoading ? <Loader2 className="animate-spin" /> : null}
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : t('resendEmail')}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
