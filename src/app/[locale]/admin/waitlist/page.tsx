'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Instagram, Facebook, Download, Trash2, Loader2, Users } from 'lucide-react';

interface WaitlistEntry {
  id: string;
  email: string;
  platform: string;
  createdAt: string;
}

export default function AdminWaitlistPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [counts, setCounts] = useState({ instagram: 0, facebook: 0 });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const res = await fetch('/api/admin/waitlist');
    const data = await res.json();
    setEntries(data.entries || []);
    setCounts(data.counts || { instagram: 0, facebook: 0 });
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet email de la liste ?')) return;
    setDeleting(id);
    try {
      await fetch('/api/admin/waitlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      toast({ title: 'Email supprimé' });
      fetchData();
    } finally {
      setDeleting(null);
    }
  };

  const exportCSV = () => {
    const rows = ['email,platform,date', ...entries.map(e =>
      `${e.email},${e.platform},${new Date(e.createdAt).toLocaleDateString('fr-FR')}`
    )];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const platformBadge = (platform: string) =>
    platform === 'instagram'
      ? <Badge className="bg-pink-100 text-pink-700 border-pink-200"><Instagram className="w-3 h-3 me-1" />Instagram</Badge>
      : <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Facebook className="w-3 h-3 me-1" />Facebook</Badge>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Liste d'attente</h1>
        <Button variant="outline" onClick={exportCSV} disabled={entries.length === 0}>
          <Download className="w-4 h-4 me-2" />Exporter CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total inscrits</p>
              <p className="text-2xl font-bold">{entries.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Instagram className="w-8 h-8 text-pink-500" />
            <div>
              <p className="text-sm text-muted-foreground">Instagram</p>
              <p className="text-2xl font-bold">{counts.instagram}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Facebook className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Facebook Messenger</p>
              <p className="text-2xl font-bold">{counts.facebook}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Emails inscrits</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun email pour l'instant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-start pb-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-start pb-3 font-medium text-muted-foreground">Plateforme</th>
                    <th className="text-start pb-3 font-medium text-muted-foreground">Date</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-3 font-mono text-xs">{entry.email}</td>
                      <td className="py-3">{platformBadge(entry.platform)}</td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleting === entry.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {deleting === entry.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
