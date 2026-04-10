'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Coins, Loader2, Search } from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  tokenBalance: number;
  role: string;
  unlimitedTokens: boolean;
}

export default function AdminTokensPanel({ users }: { users: User[] }) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const selected = users.find(u => u.id === selectedUserId);

  const handleGrant = async () => {
    if (!selectedUserId || !amount) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/add-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, amount: Number(amount), description }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: `✅ ${amount} tokens ajoutés à ${selected?.name || selected?.email}. Nouveau solde : ${json.newBalance}` });
        setAmount('');
        setDescription('');
      } else {
        toast({ title: 'Erreur', description: json.error, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-orange-500" />
          Gestion des tokens utilisateurs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* User list */}
        <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
          {filtered.slice(0, 20).map(user => (
            <div
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${selectedUserId === user.id ? 'bg-orange-50 border-l-2 border-l-orange-500' : ''}`}
            >
              <div>
                <p className="text-sm font-medium">{user.name || 'Sans nom'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold">
                  {user.unlimitedTokens ? '∞' : `${user.tokenBalance.toLocaleString()}`}
                  <span className="text-xs text-muted-foreground ml-1">tokens</span>
                </p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">Aucun utilisateur trouvé</p>
          )}
        </div>

        {/* Grant form */}
        {selectedUserId && (
          <div className="border rounded-lg p-4 bg-orange-50/50 space-y-3">
            <p className="text-sm font-medium text-orange-700">
              Sélectionné : {selected?.name || selected?.email}
              <span className="ml-2 text-muted-foreground font-normal">
                (Solde actuel : {selected?.unlimitedTokens ? '∞' : selected?.tokenBalance} tokens)
              </span>
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Nombre de tokens"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={1}
                className="w-40"
              />
              <Input
                placeholder="Description (optionnel)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="flex-1"
              />
            </div>
            <Button
              onClick={handleGrant}
              disabled={loading || !amount || Number(amount) <= 0}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Coins className="w-4 h-4 mr-2" />}
              Ajouter {amount ? `${Number(amount).toLocaleString()}` : ''} tokens
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
