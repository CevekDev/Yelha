'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RotateCcw } from 'lucide-react';

const DEFAULT_PROMPT = `You are {botName}, an intelligent assistant for {businessName}.
{botPersonality}

LANGUAGE RULES (strict):
1. Detect the language of the incoming message automatically
2. Reply ALWAYS in the exact same language and dialect as the user
3. Supported languages include:
   - Arabic MSA (الفصحى)
   - Algerian Darija: wesh, rabi, nta/nti, khoya, sah, walo, mriguel, 3lach, kifah, la3mar, bessah, daba, mix Arabic/French
   - Moroccan Darija: واخا, مزيان, دابا
   - Tunisian, Egyptian, Levantine dialects
   - French, English, Spanish, and all other languages
4. Match the user's register (formal/informal) automatically
5. Never reveal you are an AI unless directly and explicitly asked
6. Adapt tone per platform: casual WhatsApp/Telegram, slightly formal Facebook

PREDEFINED RESPONSES:
{predefinedResponses}

CUSTOM INSTRUCTIONS:
{customInstructions}`;

export default function AdminSettingsForm({ initialPrompt }: { initialPrompt: string }) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState(initialPrompt || DEFAULT_PROMPT);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'global_system_prompt', value: prompt }),
      });
      if (res.ok) {
        toast({ title: 'Settings saved successfully!' });
      } else {
        toast({ title: 'Error saving settings', variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global System Prompt</CardTitle>
        <CardDescription>
          This is the base prompt used for all AI conversations across all users and connections.
          Available placeholders: <code className="bg-muted px-1 rounded text-xs">{'{botName}'}</code>,{' '}
          <code className="bg-muted px-1 rounded text-xs">{'{businessName}'}</code>,{' '}
          <code className="bg-muted px-1 rounded text-xs">{'{botPersonality}'}</code>,{' '}
          <code className="bg-muted px-1 rounded text-xs">{'{predefinedResponses}'}</code>,{' '}
          <code className="bg-muted px-1 rounded text-xs">{'{customInstructions}'}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>System Prompt</Label>
          <textarea
            className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[400px] font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin me-2" /> : null}
            Save Prompt
          </Button>
          <Button
            variant="outline"
            onClick={() => setPrompt(DEFAULT_PROMPT)}
            title="Reset to default"
          >
            <RotateCcw className="w-4 h-4 me-2" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
