'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, MessageCircle, Send, Settings, Trash2, Loader2, Instagram, Facebook, Clock } from 'lucide-react';
import Link from 'next/link';

// Only Telegram is currently active
const ACTIVE_PLATFORMS = [
  { value: 'TELEGRAM', label: 'Telegram', icon: Send, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-200' },
];

// Platforms coming soon — shown but not functional
const SOON_PLATFORMS = [
  { value: 'WHATSAPP',  label: 'WhatsApp',           icon: MessageCircle, color: 'text-green-500', bg: 'bg-green-50',  border: 'border-green-200' },
  { value: 'INSTAGRAM', label: 'Instagram DM',        icon: Instagram,     color: 'text-pink-500',  bg: 'bg-pink-50',   border: 'border-pink-200'  },
  { value: 'FACEBOOK',  label: 'Facebook Messenger',  icon: Facebook,      color: 'text-blue-500',  bg: 'bg-blue-50',   border: 'border-blue-200'  },
];

const platformIconMap: Record<string, any> = {
  WHATSAPP:  MessageCircle,
  TELEGRAM:  Send,
  INSTAGRAM: Instagram,
  FACEBOOK:  Facebook,
};
const platformColorMap: Record<string, string> = {
  WHATSAPP:  'text-green-600',
  TELEGRAM:  'text-sky-500',
  INSTAGRAM: 'text-pink-500',
  FACEBOOK:  'text-blue-600',
};

export default function ConnectionsPage() {
  const t = useTranslations('connections');
  const params = useParams();
  const locale = params.locale as string;
  const { toast } = useToast();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    platform: 'TELEGRAM',
    name: '',
    botName: 'Assistant',
    telegramBotToken: '',
  });

  useEffect(() => { fetchConnections(); }, []);

  const fetchConnections = async () => {
    const res = await fetch('/api/connections');
    const data = await res.json();
    setConnections(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: 'Connexion Telegram ajoutée !' });
        setAddOpen(false);
        setForm({ platform: 'TELEGRAM', name: '', botName: 'Assistant', telegramBotToken: '' });
        fetchConnections();
      } else {
        const json = await res.json();
        toast({ title: 'Erreur', description: json.error, variant: 'destructive' });
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette connexion ?')) return;
    await fetch(`/api/connections/${id}`, { method: 'DELETE' });
    fetchConnections();
    toast({ title: 'Connexion supprimée' });
  };

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">Gérez vos bots Telegram IA</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un bot Telegram
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-sky-500" />
                Nouveau bot Telegram
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Nom de la connexion</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Mon Bot Support"
                />
              </div>

              <div>
                <Label>Nom du bot (affiché aux clients)</Label>
                <Input
                  value={form.botName}
                  onChange={e => setForm(f => ({ ...f, botName: e.target.value }))}
                  placeholder="Assistant"
                />
              </div>

              <div>
                <Label>Bot Token (depuis @BotFather)</Label>
                <Input
                  type="password"
                  value={form.telegramBotToken}
                  onChange={e => setForm(f => ({ ...f, telegramBotToken: e.target.value }))}
                  placeholder="1234567890:AAAA..."
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Créez un bot via{' '}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-500 hover:underline"
                  >
                    @BotFather
                  </a>{' '}
                  et copiez le token ici. Le webhook sera configuré automatiquement.
                </p>
              </div>

              <Button
                onClick={handleAdd}
                disabled={adding || !form.telegramBotToken || !form.name}
                className="w-full"
              >
                {adding ? <Loader2 className="animate-spin me-2 w-4 h-4" /> : <Send className="me-2 w-4 h-4" />}
                Connecter le bot
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Active connections ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4 text-sky-500" />
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Telegram — Actif
          </h2>
          <Badge variant="default" className="bg-sky-500 text-white text-[10px]">Disponible</Badge>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
          </div>
        ) : connections.length === 0 ? (
          <Card className="border-dashed border-sky-200">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Send className="w-10 h-10 text-sky-200 mb-3" />
              <p className="text-muted-foreground font-medium">Aucun bot Telegram connecté</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cliquez sur &quot;Ajouter un bot Telegram&quot; pour commencer.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((conn: any) => {
              const Icon = platformIconMap[conn.platform] || MessageCircle;
              return (
                <Card key={conn.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${platformColorMap[conn.platform]}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{conn.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{conn.botName || 'Assistant'}</p>
                      </div>
                    </div>
                    <Badge variant={conn.isActive ? 'default' : 'secondary'} className="text-[10px]">
                      {conn.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Link href={`/${locale}/dashboard/connections/${conn.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <Settings className="w-3.5 h-3.5" /> {t('configure')}
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(conn.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Coming Soon platforms ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Bientôt disponibles
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SOON_PLATFORMS.map(platform => {
            const Icon = platform.icon;
            return (
              <Card
                key={platform.value}
                className={`border ${platform.border} opacity-70 select-none`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${platform.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${platform.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base text-muted-foreground">{platform.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">En cours de développement</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-muted/50 border border-dashed">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">Bientôt disponible</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
