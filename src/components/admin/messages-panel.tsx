'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, Users } from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export default function AdminMessagesPanel({ users }: { users: User[] }) {
  const { toast } = useToast();
  const [targetType, setTargetType] = useState<'all' | 'user'>('user');
  const [userId, setUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!subject || !message) return;
    if (targetType === 'user' && !userId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, userId: targetType === 'user' ? userId : undefined, subject, message }),
      });
      const json = await res.json();
      if (res.ok) {
        toast({ title: `✅ Message envoyé à ${json.sent} utilisateur(s)` });
        setSubject('');
        setMessage('');
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
          <Mail className="w-5 h-5 text-blue-500" />
          Envoyer un message personnalisé
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target */}
        <div className="flex gap-2">
          <button
            onClick={() => setTargetType('user')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${targetType === 'user' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-muted hover:bg-muted/50'}`}
          >
            Un utilisateur spécifique
          </button>
          <button
            onClick={() => setTargetType('all')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${targetType === 'all' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-muted hover:bg-muted/50'}`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1" />
            Tous les utilisateurs
          </button>
        </div>

        {targetType === 'user' && (
          <div>
            <Label>Utilisateur</Label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
            >
              <option value="">Sélectionner un utilisateur</option>
              {users.filter(u => u.role === 'USER').map(u => (
                <option key={u.id} value={u.id}>
                  {u.name || 'Sans nom'} — {u.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label>Sujet</Label>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Ex: Vos tokens sont prêts !"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Message</Label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Rédigez votre message..."
            rows={5}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={loading || !subject || !message || (targetType === 'user' && !userId)}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
          {targetType === 'all' ? 'Envoyer à tous' : 'Envoyer le message'}
        </Button>
      </CardContent>
    </Card>
  );
}
