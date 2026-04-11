'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Reset password is now handled by forgot-password page (code-based flow)
export default function ResetPasswordPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${locale}/auth/forgot-password`);
  }, [locale, router]);

  return null;
}
