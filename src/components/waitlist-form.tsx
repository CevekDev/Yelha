'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface WaitlistFormProps {
  platform: 'instagram' | 'facebook';
  label: string;
}

export function WaitlistForm({ platform, label }: WaitlistFormProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, platform }),
      });
      if (res.ok) {
        setDone(true);
        toast({ title: 'Inscrit !', description: 'Vous serez notifié dès le lancement.' });
      } else {
        const data = await res.json();
        toast({ title: 'Erreur', description: data.error, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <p className="text-sm text-green-600 font-medium text-center py-2">
        ✓ Inscrit avec succès ! On vous contacte dès le lancement.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
      <Input
        type="email"
        placeholder="votre@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="text-sm"
      />
      <Button type="submit" size="sm" disabled={loading} variant="outline">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Rejoindre`}
      </Button>
    </form>
  );
}
