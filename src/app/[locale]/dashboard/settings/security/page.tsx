'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SecurityPage() {
  const params = useParams();
  const locale = params.locale as string;
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'idle' | 'setup' | 'backup'>('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => { fetch('/api/user/me').then(r => r.json()).then(u => { setUser(u); setLoading(false); }); }, []);

  const handleSetup2FA = async () => {
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
    const data = await res.json();
    setQrCode(data.qrCode); setSecret(data.secret); setStep('setup');
  };

  const handleVerify2FA = async () => {
    setVerifying(true);
    try {
      const res = await fetch('/api/auth/2fa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, secret }) });
      const data = await res.json();
      if (res.ok) { setBackupCodes(data.backupCodes); setUser((u: any) => ({ ...u, twoFactorEnabled: true })); setStep('backup'); toast({ title: '2FA enabled successfully!' }); }
      else toast({ title: 'Invalid code', description: data.error, variant: 'destructive' });
    } finally { setVerifying(false); }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Disable 2FA?')) return;
    const res = await fetch('/api/auth/2fa/disable', { method: 'POST' });
    if (res.ok) { setUser((u: any) => ({ ...u, twoFactorEnabled: false })); setStep('idle'); toast({ title: '2FA disabled' }); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8" /></div>;

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/dashboard/settings`}><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />2FA Status<Badge variant={user.twoFactorEnabled ? 'success' : 'secondary'}>{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}</Badge></CardTitle>
          <CardDescription>Add an extra layer of security with a TOTP authenticator app.</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'idle' && (
            user.twoFactorEnabled
              ? <Button variant="destructive" onClick={handleDisable2FA}>Disable 2FA</Button>
              : <Button onClick={handleSetup2FA}><Shield className="w-4 h-4 me-2" />Enable 2FA</Button>
          )}
          {step === 'setup' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">1. Install an authenticator app<br />2. Scan the QR code<br />3. Enter the 6-digit code</p>
              {qrCode && <div className="flex justify-center"><img src={qrCode} alt="QR Code" className="w-48 h-48 border rounded-lg" /></div>}
              <div>
                <Label className="text-xs text-muted-foreground">Or enter manually:</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={showSecret ? secret : '•'.repeat(secret.length)} readOnly className="font-mono text-sm" />
                  <Button variant="ghost" size="icon" onClick={() => setShowSecret(!showSecret)}>{showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
                </div>
              </div>
              <div><Label>Verification Code</Label><Input value={code} onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" className="font-mono text-lg text-center tracking-widest mt-1" maxLength={6} /></div>
              <div className="flex gap-2">
                <Button onClick={handleVerify2FA} disabled={verifying || code.length !== 6} className="flex-1">{verifying ? <Loader2 className="animate-spin me-2" /> : null}Verify & Enable</Button>
                <Button variant="outline" onClick={() => setStep('idle')}>Cancel</Button>
              </div>
            </div>
          )}
          {step === 'backup' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-5 h-5" /><p className="font-medium">2FA is now enabled!</p></div>
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm font-medium mb-3 text-destructive">Save these backup codes — they won't be shown again</p>
                <div className="grid grid-cols-2 gap-2">{backupCodes.map((c, i) => <code key={i} className="bg-background border rounded px-2 py-1 text-sm font-mono text-center">{c}</code>)}</div>
              </div>
              <Button onClick={() => setStep('idle')} className="w-full">Done</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
