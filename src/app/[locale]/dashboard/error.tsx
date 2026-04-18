'use client';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams();
  const locale = (params?.locale as string) || 'fr';

  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
        style={{ background: 'rgba(255,107,44,0.12)' }}
      >
        ⚠️
      </div>
      <div className="text-center">
        <p className="font-mono font-semibold text-white text-sm mb-1">Une erreur est survenue</p>
        <p className="font-mono text-white/30 text-xs">
          {error.digest ? `Ref: ${error.digest}` : 'Veuillez réessayer.'}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="font-mono text-sm text-white px-5 py-2.5 rounded-xl transition-all hover:opacity-90"
          style={{ background: '#FF6B2C' }}
        >
          Réessayer
        </button>
        <Link
          href={`/${locale}/dashboard`}
          className="font-mono text-sm text-white/50 hover:text-white px-5 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
