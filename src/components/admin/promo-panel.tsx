'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Tag, Plus, Loader2, X, Shuffle } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  tokens: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: Date | string | null;
  description: string | null;
  _count: { uses: number };
}

function generateCode(prefix = 'YELHA') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${suffix}`;
}

export default function AdminPromoPanel({ initialCodes }: { initialCodes: PromoCode[] }) {
  const { toast } = useToast();
  const [codes, setCodes] = useState<PromoCode[]>(initialCodes);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: generateCode(),
    tokens: '100',
    maxUses: '1',
    expiresAt: '',
    description: '',
  });

  const refreshCodes = async () => {
    const res = await fetch('/api/admin/promo-codes');
    const data = await res.json();
    setCodes(data);
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          tokens: Number(form.tokens),
          maxUses: Number(form.maxUses),
          expiresAt: form.expiresAt || undefined,
          description: form.description || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: `✅ Code promo "${form.code}" créé !` });
        setShowForm(false);
        setForm({ code: generateCode(), tokens: '100', maxUses: '1', expiresAt: '', description: '' });
        await refreshCodes();
      } else {
        toast({ title: 'Erreur', description: json.error, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: string, code: string) => {
    await fetch('/api/admin/promo-codes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    toast({ title: `Code "${code}" désactivé` });
    await refreshCodes();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-500" />
          Codes promo
        </CardTitle>
        <Button size="sm" onClick={() => setShowForm(v => !v)} variant="outline">
          <Plus className="w-4 h-4 mr-1" /> Nouveau code
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create form */}
        {showForm && (
          <div className="border rounded-xl p-4 bg-purple-50/50 space-y-3">
            <h3 className="font-semibold text-sm text-purple-800">Créer un code promo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Code</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="YELHA-XXXXX"
                    className="font-mono"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setForm(f => ({ ...f, code: generateCode() }))}
                    title="Générer"
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Tokens offerts</Label>
                <Input
                  type="number"
                  value={form.tokens}
                  onChange={e => setForm(f => ({ ...f, tokens: e.target.value }))}
                  min={1}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Utilisations max</Label>
                <Input
                  type="number"
                  value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                  min={1}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Expire le (optionnel)</Label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Description (optionnel)</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Offre lancement"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={loading || !form.code || !form.tokens}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Créer le code
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </div>
        )}

        {/* Codes list */}
        <div className="space-y-2">
          {codes.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">Aucun code promo créé</p>
          )}
          {codes.map(code => (
            <div
              key={code.id}
              className={`flex items-center justify-between border rounded-xl px-4 py-3 ${!code.isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">{code.code}</span>
                    {!code.isActive && <Badge variant="secondary" className="text-[10px]">Désactivé</Badge>}
                    {code.expiresAt && new Date(code.expiresAt as string) < new Date() && (
                      <Badge variant="destructive" className="text-[10px]">Expiré</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      <span className="font-semibold text-purple-600">+{code.tokens}</span> tokens
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {code._count.uses}/{code.maxUses} utilisations
                    </span>
                    {code.description && (
                      <span className="text-xs text-muted-foreground italic">{code.description}</span>
                    )}
                  </div>
                </div>
              </div>
              {code.isActive && (
                <button
                  onClick={() => handleDeactivate(code.id, code.code)}
                  className="text-destructive hover:text-destructive/80 p-1 rounded"
                  title="Désactiver"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
