'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Trash2, LogOut, Shield, Monitor } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

export default function SettingsPage() {
  const tCommon = useTranslations('common');
  const params = useParams();
  const locale = params.locale as string;
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([fetch('/api/user/me').then(r => r.json()), fetch('/api/user/sessions').then(r => r.json())]).then(([u, s]) => { setUser(u); setName(u.name || ''); setSessions(Array.isArray(s) ? s : []); });
  }, []);

  const handleSaveName = async () => {
    setSavingName(true);
    try {
      const res = await fetch('/api/user/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      if (res.ok) toast({ title: tCommon('success'), description: 'Name updated!' });
    } finally { setSavingName(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/user/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'aireply-data-export.json'; a.click(); URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  const handleRevokeSession = async (sessionId: string) => {
    await fetch('/api/user/sessions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) });
    setSessions(s => s.filter(sess => sess.id !== sessionId));
    toast({ title: 'Session revoked' });
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure? This will permanently delete all your data.')) return;
    setDeleting(true);
    await fetch('/api/user/delete', { method: 'DELETE' });
    await signOut({ callbackUrl: `/${locale}` });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Full Name</Label><div className="flex gap-2 mt-1"><Input value={name} onChange={e => setName(e.target.value)} /><Button onClick={handleSaveName} disabled={savingName}>{savingName ? <Loader2 className="animate-spin" /> : tCommon('save')}</Button></div></div>
          <div><Label>Email</Label><Input value={user?.email || ''} disabled className="mt-1" /></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Security</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Two-Factor Authentication</p><p className="text-sm text-muted-foreground">{user?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</p></div>
            <Link href={`/${locale}/dashboard/settings/security`}><Button variant="outline">{user?.twoFactorEnabled ? 'Manage' : 'Enable 2FA'}</Button></Link>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Monitor className="w-5 h-5" /> Active Sessions</CardTitle><CardDescription>Manage your active login sessions</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {sessions.map((sess: any) => (
            <div key={sess.id} className="flex items-center justify-between border rounded-lg p-3">
              <div><p className="text-sm font-medium truncate max-w-xs">{sess.userAgent || 'Unknown browser'}</p><p className="text-xs text-muted-foreground">{sess.ipAddress || 'Unknown IP'} · {new Date(sess.lastActivity).toLocaleDateString()}</p></div>
              <Button variant="ghost" size="sm" onClick={() => handleRevokeSession(sess.id)} className="text-destructive"><LogOut className="w-4 h-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Data & Privacy</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Export my data</p><p className="text-sm text-muted-foreground">Download all your data as JSON</p></div>
            <Button variant="outline" onClick={handleExport} disabled={exporting}>{exporting ? <Loader2 className="animate-spin me-2" /> : <Download className="w-4 h-4 me-2" />}Export</Button>
          </div>
          <div className="flex items-center justify-between">
            <div><p className="font-medium text-destructive">Delete account</p><p className="text-sm text-muted-foreground">Permanently delete all your data</p></div>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>{deleting ? <Loader2 className="animate-spin me-2" /> : <Trash2 className="w-4 h-4 me-2" />}Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
