'use client';

import { getPasswordStrength } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function PasswordStrength({ password }: { password: string }) {
  const t = useTranslations('auth.passwordStrength');

  if (!password) return null;

  const strength = getPasswordStrength(password);
  const colors = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };
  const widths = { weak: 'w-1/3', medium: 'w-2/3', strong: 'w-full' };

  return (
    <div className="mt-1">
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-300 rounded-full ${colors[strength]} ${widths[strength]}`} />
      </div>
      <p className={`text-xs mt-1 ${strength === 'weak' ? 'text-red-500' : strength === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
        {t(strength)}
      </p>
    </div>
  );
}
