'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';

  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-5xl font-mono font-bold text-[#FF6B2C] mb-4">500</p>
        <h1 className="text-xl font-mono font-semibold text-white mb-2">Une erreur est survenue</h1>
        <p className="text-white/40 font-mono text-sm mb-8">
          {error.digest ? `Ref: ${error.digest}` : 'Veuillez réessayer ou contacter le support.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="font-mono text-sm text-white px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
            style={{ background: '#FF6B2C' }}
          >
            Réessayer
          </button>
          <Link
            href={`/${locale}`}
            className="font-mono text-sm text-white/50 hover:text-white px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
