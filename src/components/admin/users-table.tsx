'use client';
import { useState, useTransition } from 'react';
import { Users, Search, CheckCircle, XCircle, Shield, User, Ban, Gift, X, Check, AlertCircle, Package } from 'lucide-react';

const ORANGE = '#FF6B2C';

const PACKAGES = [
  { key: 'starter',  name: 'Starter',  tokens: 500,   color: '#60a5fa' },
  { key: 'business', name: 'Business', tokens: 2000,  color: ORANGE },
  { key: 'pro',      name: 'Pro',      tokens: 5000,  color: '#8B5CF6' },
  { key: 'agency',   name: 'Agency',   tokens: 15000, color: '#10B981' },
];

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  tokenBalance: number;
  role: string;
  unlimitedTokens: boolean;
  isBanned: boolean;
  createdAt: Date | string;
  emailVerified: Date | string | null;
  _count: { connections: number };
}

export default function AdminUsersTable({ users: initialUsers }: { users: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN' | 'BANNED'>('ALL');
  const [isPending, startTransition] = useTransition();

  // Gift modal
  const [giftUser, setGiftUser] = useState<AdminUser | null>(null);
  const [giftMode, setGiftMode] = useState<'pack' | 'custom'>('pack');
  const [giftPackKey, setGiftPackKey] = useState('');
  const [giftTokens, setGiftTokens] = useState('');
  const [giftReason, setGiftReason] = useState('');
  const [giftSuccess, setGiftSuccess] = useState('');

  // Ban modal
  const [banUser, setBanUser] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState('');

  const filtered = users.filter(u => {
    const matchSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(search.toLowerCase());
    const matchRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'BANNED' ? u.isBanned : u.role === roleFilter && !u.isBanned);
    return matchSearch && matchRole;
  });

  const handleGift = () => {
    if (!giftUser) return;
    const payload: any = { reason: giftReason };
    if (giftMode === 'pack') {
      if (!giftPackKey) return;
      payload.packKey = giftPackKey;
    } else {
      if (!giftTokens || Number(giftTokens) <= 0) return;
      payload.tokens = Number(giftTokens);
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${giftUser.id}/gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => prev.map(u => u.id === giftUser.id ? { ...u, tokenBalance: data.newBalance } : u));
        const pack = PACKAGES.find(p => p.key === giftPackKey);
        const label = pack ? `Pack ${pack.name} (${pack.tokens.toLocaleString()} tokens)` : `${giftTokens} tokens`;
        setGiftSuccess(`✅ ${label} offert à ${giftUser.name || giftUser.email} — email envoyé`);
        setTimeout(() => { setGiftUser(null); setGiftSuccess(''); setGiftPackKey(''); setGiftTokens(''); setGiftReason(''); }, 2500);
      }
    });
  };

  const handleBan = (ban: boolean) => {
    if (!banUser) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${banUser.id}/ban`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBanned: ban, bannedReason: banReason }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === banUser.id ? { ...u, isBanned: ban } : u));
        setBanUser(null);
        setBanReason('');
      }
    });
  };

  return (
    <>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#60a5fa20' }}>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-mono font-semibold text-white text-sm">Utilisateurs ({users.length})</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              {(['ALL', 'USER', 'ADMIN', 'BANNED'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className="px-2.5 py-1 rounded-md font-mono text-xs transition-all"
                  style={roleFilter === r
                    ? { background: r === 'BANNED' ? '#ef444425' : ORANGE + '25', color: r === 'BANNED' ? '#ef4444' : ORANGE }
                    : { color: 'rgba(255,255,255,0.3)' }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-mono text-white bg-white/[0.04] border border-white/[0.07] rounded-lg focus:outline-none focus:border-[#FF6B2C]/40 placeholder:text-white/20 w-44"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.04]">
                {['Utilisateur', 'Tokens', 'Bots', 'Email vérifié', 'Rôle', 'Inscrit le', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white/30 font-normal uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map(u => (
                <tr key={u.id} className={`hover:bg-white/[0.02] transition-colors ${u.isBanned ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {u.isBanned && <Ban className="w-3 h-3 text-red-400 flex-shrink-0" />}
                      <div>
                        <p className="text-white/80 font-medium">{u.name || '—'}</p>
                        <p className="text-white/30 text-[10px]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold" style={{ color: ORANGE }}>
                      {u.unlimitedTokens ? '∞' : u.tokenBalance.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50">{u._count.connections}</td>
                  <td className="px-4 py-3">
                    {u.emailVerified
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400/60" />}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                      style={u.isBanned
                        ? { background: '#ef444415', color: '#ef4444' }
                        : u.role === 'ADMIN'
                          ? { background: `${ORANGE}20`, color: ORANGE }
                          : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                    >
                      {u.isBanned ? <Ban className="w-2.5 h-2.5" /> : u.role === 'ADMIN' ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                      {u.isBanned ? 'BANNI' : u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/30" suppressHydrationWarning>
                    {new Date(u.createdAt).toLocaleDateString('fr-DZ')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setGiftUser(u); setGiftMode('pack'); setGiftPackKey(''); setGiftTokens(''); setGiftReason(''); setGiftSuccess(''); }}
                        className="p-1.5 rounded-lg text-white/20 hover:text-green-400 hover:bg-green-500/10 transition-all"
                        title="Offrir un pack ou des tokens"
                      >
                        <Gift className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setBanUser(u); setBanReason(''); }}
                        className={`p-1.5 rounded-lg transition-all ${u.isBanned
                          ? 'text-green-400 hover:bg-green-500/10'
                          : 'text-white/20 hover:text-red-400 hover:bg-red-500/10'}`}
                        title={u.isBanned ? 'Débannir' : 'Bannir'}
                      >
                        {u.isBanned ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-white/20">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gift modal */}
      {giftUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setGiftUser(null)} />
          <div className="relative w-full max-w-md bg-[#0D0D10] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-mono font-bold text-white text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-400" />
                Offrir des tokens
              </h2>
              <button onClick={() => setGiftUser(null)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {giftSuccess ? (
              <div className="text-center py-4">
                <p className="font-mono text-sm text-green-400">{giftSuccess}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.06]">
                  <p className="font-mono text-xs text-white/50">{giftUser.name || giftUser.email}</p>
                  <p className="font-mono text-sm font-bold text-white mt-0.5">
                    Solde actuel : <span style={{ color: ORANGE }}>{giftUser.tokenBalance.toLocaleString()} tokens</span>
                  </p>
                </div>

                {/* Mode tabs */}
                <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  {[
                    { key: 'pack', label: 'Pack prédéfini', icon: Package },
                    { key: 'custom', label: 'Montant libre', icon: Gift },
                  ].map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setGiftMode(tab.key as 'pack' | 'custom')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-mono text-xs transition-all"
                        style={giftMode === tab.key
                          ? { background: `${ORANGE}25`, color: ORANGE }
                          : { color: 'rgba(255,255,255,0.3)' }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {giftMode === 'pack' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {PACKAGES.map(pack => (
                      <button
                        key={pack.key}
                        onClick={() => setGiftPackKey(pack.key)}
                        className="p-3 rounded-xl border transition-all text-left"
                        style={giftPackKey === pack.key
                          ? { borderColor: pack.color, background: `${pack.color}15` }
                          : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
                      >
                        <p className="font-mono text-xs font-bold" style={{ color: pack.color }}>{pack.name}</p>
                        <p className="font-mono text-[10px] text-white/40 mt-0.5">{pack.tokens.toLocaleString()} tokens</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div>
                    <label className="block font-mono text-xs text-white/50 mb-1.5">Nombre de tokens à offrir</label>
                    <input
                      type="number"
                      value={giftTokens}
                      onChange={e => setGiftTokens(e.target.value)}
                      placeholder="Ex: 500"
                      min="1"
                      className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-orange-500/40"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-mono text-xs text-white/50 mb-1.5">Raison (optionnel)</label>
                  <input
                    type="text"
                    value={giftReason}
                    onChange={e => setGiftReason(e.target.value)}
                    placeholder="Ex: Compensation, offre spéciale..."
                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-orange-500/40"
                  />
                </div>

                <p className="font-mono text-[10px] text-white/30 flex items-center gap-1">
                  📧 L&apos;utilisateur recevra un email de notification automatiquement.
                </p>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setGiftUser(null)} className="flex-1 py-2.5 rounded-xl font-mono text-sm text-white/50 border border-white/[0.08] hover:border-white/20 transition-all">
                    Annuler
                  </button>
                  <button
                    onClick={handleGift}
                    disabled={isPending || (giftMode === 'pack' ? !giftPackKey : (!giftTokens || Number(giftTokens) <= 0))}
                    className="flex-1 py-2.5 rounded-xl font-mono text-sm font-semibold text-white bg-green-600 hover:bg-green-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Gift className="w-4 h-4" />}
                    Offrir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ban modal */}
      {banUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setBanUser(null)} />
          <div className="relative w-full max-w-md bg-[#0D0D10] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-mono font-bold text-white text-lg flex items-center gap-2">
                {banUser.isBanned
                  ? <><Check className="w-5 h-5 text-green-400" /> Débannir</>
                  : <><Ban className="w-5 h-5 text-red-400" /> Bannir</>}
              </h2>
              <button onClick={() => setBanUser(null)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="font-mono text-xs text-white/60">
                  {banUser.isBanned
                    ? `Débannir ${banUser.name || banUser.email} — le compte sera réactivé immédiatement.`
                    : `Bannir ${banUser.name || banUser.email} — le bot ne répondra plus à ses clients et il ne pourra plus se connecter.`}
                </p>
              </div>
              {!banUser.isBanned && (
                <div>
                  <label className="block font-mono text-xs text-white/50 mb-1.5">Raison du bannissement</label>
                  <input
                    type="text"
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    placeholder="Ex: Abus, fraude, non-paiement..."
                    className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-red-500/40"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setBanUser(null)} className="flex-1 py-2.5 rounded-xl font-mono text-sm text-white/50 border border-white/[0.08] hover:border-white/20 transition-all">
                  Annuler
                </button>
                <button
                  onClick={() => handleBan(!banUser.isBanned)}
                  disabled={isPending}
                  className={`flex-1 py-2.5 rounded-xl font-mono text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                    banUser.isBanned ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : banUser.isBanned ? <Check className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  {banUser.isBanned ? 'Débannir' : 'Confirmer le bannissement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
