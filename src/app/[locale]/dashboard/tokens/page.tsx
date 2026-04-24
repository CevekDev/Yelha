'use client';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
import {
  Coins, Loader2, ShoppingCart, Tag, CheckCircle, Zap,
  CreditCard, Building2, Copy, MessageCircle, Clock,
  ArrowUpRight, ArrowDownLeft, Gift, TrendingUp, Check,
} from 'lucide-react';

const ORANGE = '#FF6B2C';
const CCP_NUMBER = '00799999004399346548';
const WHATSAPP_NUMBER = '+33761179379';

const TX_ICONS: Record<string, React.ElementType> = {
  PURCHASE: CreditCard,
  USAGE: ArrowUpRight,
  TRIAL: Gift,
  ADMIN_GRANT: Gift,
  BONUS: Gift,
  REFUND: ArrowDownLeft,
};

const TX_COLORS: Record<string, string> = {
  PURCHASE: '#10B981',
  USAGE: '#EF4444',
  TRIAL: ORANGE,
  ADMIN_GRANT: '#8B5CF6',
  BONUS: '#8B5CF6',
  REFUND: '#10B981',
};

/** Generate feature list based on token count */
function getPackageFeatures(tokens: number): string[] {
  const approxExchanges = Math.round(tokens / 280);
  if (tokens <= 30_000) return [
    `≈ ${approxExchanges.toLocaleString()} échanges`,
    '1 bot Telegram',
    'Catalogue produits',
    'Prise de commandes',
  ];
  if (tokens <= 100_000) return [
    `≈ ${approxExchanges.toLocaleString()} échanges`,
    'Bots illimités',
    'Intégration Ecotrack',
    'Import CSV produits',
    'Support prioritaire',
  ];
  if (tokens <= 300_000) return [
    `≈ ${approxExchanges.toLocaleString()} échanges`,
    'Bots illimités',
    'Toutes intégrations',
    'Vue d\'ensemble avancée',
    'Support premium',
  ];
  return [
    `≈ ${approxExchanges.toLocaleString()}+ échanges`,
    'Bots illimités',
    'Tout inclus',
    'API dédiée',
    'Support VIP 24/7',
  ];
}

export default function TokensPage() {
  const t = useTranslations('tokens');
  const params = useParams();
  const locale = params.locale as string;
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [packages, setPackages] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [unlimited, setUnlimited] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoApplied, setPromoApplied] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'chargily' | 'ccp'>('chargily');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({ title: '✅ Paiement réussi !', description: 'Vos tokens ont été ajoutés à votre compte.' });
    }
    if (searchParams.get('canceled') === 'true') {
      toast({ title: 'Paiement annulé', variant: 'destructive' });
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    const [pkgRes, userRes, txRes] = await Promise.all([
      fetch('/api/tokens/packages'),
      fetch('/api/user/me'),
      fetch('/api/user/transactions'),
    ]);
    const [pkgs, user, txs] = await Promise.all([pkgRes.json(), userRes.json(), txRes.ok ? txRes.json() : []]);
    setPackages(Array.isArray(pkgs) ? pkgs : []);
    setBalance(user.tokenBalance || 0);
    setUnlimited(user.unlimitedTokens || false);
    setTransactions(Array.isArray(txs) ? txs : []);
  };

  const handlePurchase = async (packageId: string) => {
    setLoadingPkg(packageId);
    try {
      const res = await fetch('/api/tokens/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, locale }),
      });
      const data = await res.json();
      if (data.url) {
        if (window.top) {
          window.top.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } else {
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' });
      }
    } finally {
      setLoadingPkg(null);
    }
  };

  const handlePromoApply = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const res = await fetch('/api/promo-codes/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setPromoApplied(true);
        setPromoCode('');
        toast({ title: `🎉 Code appliqué ! +${data.tokensAdded} tokens` });
        fetchData();
      } else {
        toast({ title: 'Code invalide', description: data.error, variant: 'destructive' });
      }
    } finally {
      setPromoLoading(false);
    }
  };

  const copyCCP = () => {
    navigator.clipboard.writeText(CCP_NUMBER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sendReceipt = () => {
    const msg = encodeURIComponent(
      `Bonjour, je viens d'effectuer un versement CCP pour acheter des tokens YelhaDms.\n\nNuméro CCP : ${CCP_NUMBER}\n\nMerci de valider mon compte.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${msg}`, '_blank');
  };

  // ── Consumption stats ────────────────────────────────────────────────
  const usageTransactions = transactions.filter((tx: any) => tx.type === 'USAGE');
  const totalUsed = usageTransactions.reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);
  const totalPurchased = transactions
    .filter((tx: any) => ['PURCHASE', 'TRIAL', 'ADMIN_GRANT', 'BONUS', 'REFUND', 'PACK_GRANT'].includes(tx.type))
    .reduce((sum: number, tx: any) => sum + Math.max(tx.amount, 0), 0);
  const usageRatePct = totalPurchased > 0
    ? Math.min(Math.round((totalUsed / totalPurchased) * 100), 100)
    : 0;

  // Last 30 days usage
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const usedLast30 = usageTransactions
    .filter((tx: any) => new Date(tx.createdAt) >= thirtyDaysAgo)
    .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount), 0);

  const creditTxs = transactions.filter((tx: any) =>
    ['TRIAL', 'PURCHASE', 'PACK_GRANT', 'ADMIN_GRANT', 'BONUS', 'REFUND'].includes(tx.type)
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-mono text-white">Tokens & Paiement</h1>
        <p className="text-white/40 text-sm mt-1 font-mono">Rechargez votre compte et consultez votre historique</p>
      </div>

      {/* Balance card */}
      <div
        className="rounded-2xl p-6 flex items-center gap-5 border border-white/[0.06]"
        style={{ background: `linear-gradient(135deg, ${ORANGE}15 0%, var(--dt-card) 100%)` }}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${ORANGE}25` }}>
          <Coins className="w-8 h-8" style={{ color: ORANGE }} />
        </div>
        <div className="flex-1">
          <p className="text-white/50 text-sm font-mono">{t('balance')}</p>
          <p className="text-4xl font-bold font-mono text-white mt-0.5">
            {unlimited ? '∞' : balance.toLocaleString()}
          </p>
          <p className="text-white/30 text-xs mt-1">{unlimited ? 'Tokens illimités' : 'tokens disponibles'}</p>
        </div>
        {!unlimited && balance > 0 && (
          <div className="hidden sm:flex flex-col items-end gap-1">
            <p className="font-mono text-xs text-white/30">≈ messages restants</p>
            <p className="font-mono text-xl font-bold text-white">{Math.round(balance / 280).toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* ── Token consumption stats ── */}
      {(totalUsed > 0 || totalPurchased > 0) && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${ORANGE}20` }}>
              <TrendingUp className="w-4 h-4" style={{ color: ORANGE }} />
            </div>
            <h2 className="font-mono font-semibold text-white text-sm">Consommation de tokens</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Achetés (total)', value: totalPurchased.toLocaleString(), color: '#34d399' },
              { label: 'Utilisés (total)', value: totalUsed.toLocaleString(), color: ORANGE },
              { label: '30 derniers jours', value: usedLast30.toLocaleString(), color: '#a78bfa' },
              { label: "Taux d'usage", value: `${usageRatePct}%`, color: '#60a5fa' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 text-center">
                <p className="text-lg font-bold font-mono" style={{ color: item.color }}>{item.value}</p>
                <p className="font-mono text-[10px] text-white/30 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] text-white/30">
              <span>0</span>
              <span>Utilisation</span>
              <span>{totalPurchased.toLocaleString()}</span>
            </div>
            <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${usageRatePct}%`,
                  background: `linear-gradient(90deg, ${ORANGE}, #ff9a5c)`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Buy tokens section */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4" style={{ color: ORANGE }} />
            <h2 className="font-mono font-semibold text-white text-sm uppercase tracking-wider">Acheter des tokens</h2>
          </div>

          {/* Payment method tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
            <button
              onClick={() => setPaymentTab('chargily')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold transition-all"
              style={paymentTab === 'chargily'
                ? { background: `${ORANGE}25`, color: ORANGE }
                : { color: 'var(--dt-text-40)' }}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Carte (CIB / Edahabia)
            </button>
            <button
              onClick={() => setPaymentTab('ccp')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold transition-all"
              style={paymentTab === 'ccp'
                ? { background: '#3B82F625', color: '#3B82F6' }
                : { color: 'var(--dt-text-40)' }}
            >
              <Building2 className="w-3.5 h-3.5" />
              Versement CCP
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* ChargiliPay packages */}
          {paymentTab === 'chargily' && (
            <>
              <p className="font-mono text-xs text-white/30 mb-4 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Paiement sécurisé via Chargily ePay — CIB &amp; Edahabia acceptés
              </p>
              {packages.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-white/30 font-mono text-sm">Aucun forfait disponible pour le moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {packages.map((pkg: any) => {
                    const features = getPackageFeatures(pkg.tokens);
                    return (
                      <div
                        key={pkg.id}
                        className="rounded-xl border flex flex-col overflow-hidden"
                        style={{
                          borderColor: pkg.isFeatured ? `${ORANGE}60` : 'var(--dt-border)',
                          background: pkg.isFeatured ? `${ORANGE}08` : 'var(--dt-card)',
                        }}
                      >
                        {pkg.isFeatured && (
                          <div className="text-[10px] font-mono font-bold text-center py-1.5 text-white tracking-wider uppercase" style={{ background: ORANGE }}>
                            ★ Populaire
                          </div>
                        )}
                        <div className="p-4 flex flex-col flex-1">
                          <p className="font-mono font-bold text-white text-sm">{pkg.name}</p>
                          <p className="text-white/40 text-xs mt-0.5">{pkg.tokens.toLocaleString()} tokens</p>
                          <p className="text-2xl font-bold font-mono mt-3" style={{ color: pkg.isFeatured ? ORANGE : 'var(--dt-text)' }}>
                            {pkg.price.toLocaleString('fr-FR')} <span className="text-sm font-normal text-white/40">DA</span>
                          </p>

                          {/* Feature list */}
                          <ul className="mt-3 mb-4 space-y-1.5">
                            {features.map((feat) => (
                              <li key={feat} className="flex items-center gap-1.5">
                                <Check
                                  className="w-3 h-3 flex-shrink-0"
                                  style={{ color: pkg.isFeatured ? ORANGE : '#34d399' }}
                                />
                                <span className="font-mono text-[11px] text-white/60">{feat}</span>
                              </li>
                            ))}
                          </ul>

                          <button
                            onClick={() => handlePurchase(pkg.id)}
                            disabled={!!loadingPkg}
                            className="mt-auto w-full flex items-center justify-center gap-1.5 font-mono text-xs py-2.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-40"
                            style={pkg.isFeatured
                              ? { background: ORANGE, color: '#fff' }
                              : { background: 'rgba(255,255,255,0.06)', color: 'var(--dt-text-80)', border: '1px solid var(--dt-border-2)' }}
                          >
                            {loadingPkg === pkg.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                            Payer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* CCP transfer */}
          {paymentTab === 'ccp' && (
            <div className="space-y-5">
              <div className="bg-blue-500/[0.06] border border-blue-500/20 rounded-xl p-4">
                <p className="font-mono text-xs text-blue-400 leading-relaxed">
                  Effectuez un versement CCP au numéro ci-dessous, puis envoyez votre reçu via WhatsApp.
                  Votre compte sera crédité dans les <strong>24h ouvrées</strong>.
                </p>
              </div>

              {/* Pack prices reminder */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {packages.map((pkg: any) => (
                  <div
                    key={pkg.id}
                    className="rounded-xl p-3 text-center border"
                    style={{
                      background: pkg.isFeatured ? `${ORANGE}08` : 'var(--dt-card)',
                      borderColor: pkg.isFeatured ? `${ORANGE}40` : 'var(--dt-border)',
                    }}
                  >
                    <p className="font-mono text-xs font-bold text-white">{pkg.name}</p>
                    <p className="font-mono text-[10px] text-white/40 mt-0.5">{pkg.tokens.toLocaleString()} tokens</p>
                    <p className="font-mono text-sm font-bold mt-1.5" style={{ color: pkg.isFeatured ? ORANGE : 'var(--dt-text-80)' }}>
                      {pkg.price.toLocaleString('fr-FR')} DA
                    </p>
                  </div>
                ))}
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {[
                  {
                    n: '01',
                    title: 'Choisissez votre pack',
                    desc: 'Sélectionnez le montant correspondant à votre pack ci-dessus.',
                  },
                  {
                    n: '02',
                    title: 'Versez au numéro CCP',
                    desc: null,
                    ccp: true,
                  },
                  {
                    n: '03',
                    title: 'Envoyez le reçu de versement',
                    desc: 'Envoyez une photo de votre reçu sur WhatsApp avec votre email YelhaDms.',
                    whatsapp: true,
                  },
                ].map(step => (
                  <div key={step.n} className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold flex-shrink-0"
                      style={{ background: '#3B82F615', border: '1px solid #3B82F630', color: '#3B82F6' }}
                    >
                      {step.n}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold text-white">{step.title}</p>
                      {step.desc && <p className="font-mono text-xs text-white/40 mt-1">{step.desc}</p>}

                      {step.ccp && (
                        <div className="mt-2 space-y-2">
                          <div
                            className="w-full px-3 py-2.5 rounded-lg font-mono text-sm font-bold text-white border break-all"
                            style={{ background: '#3B82F615', borderColor: '#3B82F630', letterSpacing: '0.04em' }}
                          >
                            {CCP_NUMBER}
                          </div>
                          <button
                            onClick={copyCCP}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs transition-all"
                            style={copied
                              ? { background: '#10B98120', color: '#10B981' }
                              : { background: 'var(--dt-card)', color: 'var(--dt-text-60)', border: '1px solid var(--dt-border)' }}
                          >
                            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copié !' : 'Copier le numéro'}
                          </button>
                        </div>
                      )}

                      {step.whatsapp && (
                        <button
                          onClick={sendReceipt}
                          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold transition-all hover:opacity-90"
                          style={{ background: '#25D36620', color: '#25D366', border: '1px solid #25D36630' }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Envoyer le reçu de versement
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Promo code */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-4 h-4" style={{ color: ORANGE }} />
          <h2 className="font-mono font-semibold text-white text-sm">Code promo</h2>
        </div>
        {promoApplied ? (
          <div className="flex items-center gap-2 text-green-400 font-mono text-sm">
            <CheckCircle className="w-4 h-4" />
            Code appliqué avec succès !
          </div>
        ) : (
          <div className="flex gap-3">
            <input
              type="text"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handlePromoApply()}
              placeholder="YELHA-XXXXXX"
              className="flex-1 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:border-[#FF6B2C]/50 transition-colors"
              style={{ background: 'var(--dt-card)' }}
            />
            <button
              onClick={handlePromoApply}
              disabled={promoLoading || !promoCode.trim()}
              className="px-5 py-2.5 rounded-xl font-mono text-sm text-white transition-all hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
              style={{ background: ORANGE }}
            >
              {promoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
            </button>
          </div>
        )}
      </div>

      {/* Transaction history — credits only */}
      {creditTxs.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/30" />
            <h2 className="font-mono font-semibold text-white text-sm">Historique des recharges</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {creditTxs.map((tx: any) => {
              const Icon = TX_ICONS[tx.type] || Coins;
              const color = TX_COLORS[tx.type] || ORANGE;
              const isDebit = tx.amount < 0;
              return (
                <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-white/70 truncate">{tx.description || tx.type}</p>
                    <p className="font-mono text-[10px] text-white/25 mt-0.5" suppressHydrationWarning>
                      {new Date(tx.createdAt).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-sm font-bold" style={{ color: isDebit ? '#EF4444' : '#10B981' }}>
                      {isDebit ? '' : '+'}{tx.amount.toLocaleString()}
                    </p>
                    <p className="font-mono text-[10px] text-white/25">solde: {tx.balance.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
