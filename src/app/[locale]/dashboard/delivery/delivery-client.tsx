'use client';

import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Truck, CheckCircle, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ORANGE = '#FF6B2C';

export interface ConnectionItem {
  id: string;
  name: string;
  platform: string;
  configured: boolean;
  ecotrackUrl: string;
  ecotrackAutoShip: boolean;
  planAllowed: boolean;
}

function ConnectionCard({ conn }: { conn: ConnectionItem }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(conn.configured);
  const [url, setUrl] = useState(conn.ecotrackUrl);
  const [token, setToken] = useState('');
  const [autoShip, setAutoShip] = useState(conn.ecotrackAutoShip);
  const [configured, setConfigured] = useState(conn.configured);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleConnect = async () => {
    if (!url || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/connections/${conn.id}/ecotrack`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, token, autoShip }),
      });
      const data = await res.json();
      if (res.ok) {
        setConfigured(true);
        setToken('');
        toast({ title: '✅ Ecotrack connecté !', description: 'Le bot validera les adresses automatiquement.' });
      } else {
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/connections/${conn.id}/ecotrack`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove: true }),
      });
      if (res.ok) {
        setConfigured(false);
        setUrl('');
        setToken('');
        setAutoShip(false);
        toast({ title: 'Ecotrack déconnecté' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoShip = async (value: boolean) => {
    setToggling(true);
    try {
      const res = await fetch(`/api/connections/${conn.id}/ecotrack`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoShipOnly: true, autoShip: value }),
      });
      if (res.ok) {
        setAutoShip(value);
        toast({ title: value ? '✅ Expédition automatique activée' : 'Expédition automatique désactivée' });
      } else {
        toast({ title: 'Erreur', variant: 'destructive' });
      }
    } finally {
      setToggling(false);
    }
  };

  const isLocked = !conn.planAllowed;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={
        configured
          ? { borderColor: `${ORANGE}35`, background: `linear-gradient(135deg, ${ORANGE}06 0%, transparent 60%)` }
          : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }
      }
    >
      {/* Header row */}
      <button
        className="w-full flex items-center justify-between p-5 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: configured ? `${ORANGE}20` : 'rgba(255,255,255,0.06)' }}
          >
            <Truck className="w-5 h-5" style={{ color: configured ? ORANGE : 'rgba(255,255,255,0.3)' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-semibold text-white text-sm">{conn.name}</span>
              <span className="font-mono text-[10px] text-white/30">{conn.platform}</span>
              {configured && (
                <span className="text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5" /> Connecté
                </span>
              )}
              {isLocked && !configured && (
                <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                  Business+
                </span>
              )}
            </div>
            {configured && (
              <p className="font-mono text-xs text-white/30 mt-0.5">{url}</p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/[0.06]">
          {isLocked && !configured ? (
            <p className="font-mono text-sm text-white/40 pt-4">
              L&apos;intégration Ecotrack est disponible à partir du pack <span className="text-orange-400 font-semibold">Business</span>.
            </p>
          ) : configured ? (
            <>
              {/* Auto-ship toggle */}
              <div className="flex items-center justify-between pt-4">
                <div>
                  <p className="font-mono text-sm text-white font-medium">Expédition automatique</p>
                  <p className="font-mono text-xs text-white/40 mt-0.5">
                    {autoShip
                      ? 'Expédiée dès que le client confirme'
                      : 'Confirmée sans expédition automatique'}
                  </p>
                </div>
                <Switch checked={autoShip} onCheckedChange={handleToggleAutoShip} disabled={toggling} />
              </div>

              {/* Update token */}
              <div className="space-y-2">
                <p className="font-mono text-xs text-white/40">Mettre à jour le token</p>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="Nouveau token API..."
                    className="flex-1 font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    onClick={handleConnect}
                    disabled={saving || !url || !token}
                  >
                    {saving ? <Loader2 className="animate-spin w-3 h-3" /> : 'Mettre à jour'}
                  </Button>
                </div>
              </div>

              {/* Disconnect */}
              <button
                onClick={handleDisconnect}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs font-mono text-red-400 hover:text-red-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Déconnecter Ecotrack
              </button>
            </>
          ) : (
            /* Not configured — show form */
            <div className="space-y-3 pt-4">
              <div>
                <label className="font-mono text-xs text-white/50 mb-1 block">URL Ecotrack</label>
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://ecotrack.app"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label className="font-mono text-xs text-white/50 mb-1 block">Token API</label>
                <Input
                  type="password"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="Votre token API Ecotrack"
                  className="font-mono text-xs"
                />
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div>
                  <p className="font-mono text-xs text-white font-medium">Expédition automatique</p>
                  <p className="font-mono text-[10px] text-white/30 mt-0.5">Expédie dès la confirmation client</p>
                </div>
                <Switch checked={autoShip} onCheckedChange={setAutoShip} />
              </div>
              <Button
                onClick={handleConnect}
                disabled={saving || !url || !token}
                className="w-full"
                style={{ background: ORANGE }}
              >
                {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Truck className="w-4 h-4 mr-2" />}
                Connecter Ecotrack
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DeliveryClient({ connections }: { connections: ConnectionItem[] }) {
  return (
    <div className="space-y-3">
      {connections.map(conn => (
        <ConnectionCard key={conn.id} conn={conn} />
      ))}
    </div>
  );
}
