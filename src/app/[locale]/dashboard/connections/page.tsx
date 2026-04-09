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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, MessageCircle, Send, Settings, Trash2, Loader2, Lock, Instagram, Facebook } from 'lucide-react';
import Link from 'next/link';

const AVAILABLE_PLATFORMS = [
  { value: 'WHATSAPP', label: 'WhatsApp (Twilio)', icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50' },
  { value: 'TELEGRAM', label: 'Telegram', icon: Send, color: 'text-sky-500', bg: 'bg-sky-50' },
];

const COMING_SOON_PLATFORMS = [
  { value: 'INSTAGRAM', label: 'Instagram DM', icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-50' },
  { value: 'FACEBOOK', label: 'Facebook Messenger', icon: Facebook, color: 'text-blue-400', bg: 'bg-blue-50' },
];

const platformIconMap: Record<string, any> = {
  WHATSAPP: MessageCircle,
  TELEGRAM: Send,
  INSTAGRAM: Instagram,
  FACEBOOK: Facebook,
};
const platformColorMap: Record<string, string> = {
  WHATSAPP: 'text-green-600',
  TELEGRAM: 'text-sky-500',
  INSTAGRAM: 'text-pink-500',
  FACEBOOK: 'text-blue-600',
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
    platform: '',
    name: '',
    botName: 'Assistant',
    twilioWhatsAppNumber: '',
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
        toast({ title: 'Connexion ajoutée !' });
        setAddOpen(false);
        setForm({ platform: '', name: '', botName: 'Assistant', twilioWhatsAppNumber: '', telegramBotToken: '' });
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 me-2" />{t('add')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('add')}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>{t('platform')}</Label>
                <Select
                  value={form.platform}
                  onValueChange={v => setForm(f => ({ ...f, platform: v, twilioWhatsAppNumber: '', telegramBotToken: '' }))}
                >
                  <SelectTrigger><SelectValue placeholder="Sélectionner une plateforme" /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_PLATFORMS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <p.icon className={`w-4 h-4 ${p.color}`} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('name')}</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Mon Bot"
                />
              </div>

              <div>
                <Label>Nom du bot</Label>
                <Input
                  value={form.botName}
                  onChange={e => setForm(f => ({ ...f, botName: e.target.value }))}
                  placeholder="Assistant"
                />
              </div>

              {form.platform === 'WHATSAPP' && (
                <div>
                  <Label>Numéro WhatsApp Business</Label>
                  <Input
                    value={form.twilioWhatsAppNumber}
                    onChange={e => setForm(f => ({ ...f, twilioWhatsAppNumber: e.target.value }))}
                    placeholder="+213xxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Entrez le numéro de téléphone lié à votre compte Twilio WhatsApp.
                  </p>
                </div>
              )}

              {form.platform === 'TELEGRAM' && (
                <div>
                  <Label>Bot Token (depuis @BotFather)</Label>
                  <Input
                    type="password"
                    value={form.telegramBotToken}
                    onChange={e => setForm(f => ({ ...f, telegramBotToken: e.target.value }))}
                    placeholder="1234567890:AAAA..."
                  />
                </div>
              )}

              <Button
                onClick={handleAdd}
                disabled={adding || !form.platform || !form.name}
                className="w-full"
              >
                {adding ? <Loader2 className="animate-spin me-2 w-4 h-4" /> : null}
                {t('add')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active connections */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
        </div>
      ) : connections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <p className="text-muted-foreground">Aucune connexion pour l'instant.</p>
            <p className="text-sm text-muted-foreground mt-1">Ajoutez WhatsApp ou Telegram pour commencer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((conn: any) => {
            const Icon = platformIconMap[conn.platform] || MessageCircle;
            return (
              <Card key={conn.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${platformColorMap[conn.platform]}`} />
                    <div>
                      <CardTitle className="text-base">{conn.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{conn.platform}</p>
                    </div>
                  </div>
                  <Badge variant={conn.isActive ? 'default' : 'secondary'}>
                    {conn.isActive ? t('active') : t('inactive')}
                  </Badge>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Link href={`/${locale}/dashboard/connections/${conn.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="w-4 h-4 me-1" />{t('configure')}
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

      {/* Coming Soon platforms */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Prochainement disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COMING_SOON_PLATFORMS.map(platform => {
            const Icon = platform.icon;
            return (
              <Card key={platform.value} className="relative overflow-hidden opacity-60 select-none">
                <div className="absolute inset-0 backdrop-blur-[2px] bg-background/40 z-10 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <Lock className="w-6 h-6 text-muted-foreground" />
                    <Badge variant="secondary" className="text-xs">Prochainement</Badge>
                  </div>
                </div>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${platform.color}`} />
                    <div>
                      <CardTitle className="text-base">{platform.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">Bientôt disponible</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    <Lock className="w-4 h-4 me-1" />En développement
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
