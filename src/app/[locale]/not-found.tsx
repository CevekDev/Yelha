import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Page introuvable | YelhaDms',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-8xl font-mono font-bold text-[#FF6B2C] mb-6">404</p>
        <h1 className="text-xl font-mono font-semibold text-white mb-3">Page introuvable</h1>
        <p className="text-white/40 font-mono text-sm mb-8">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/fr"
          className="inline-flex items-center font-mono text-sm text-white px-6 py-3 rounded-xl transition-all hover:opacity-90"
          style={{ background: '#FF6B2C' }}
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
