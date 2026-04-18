'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Trash2, RefreshCw, Check, AlertCircle, User } from 'lucide-react';

const ORANGE = '#FF6B2C';

type Msg = { senderId: string; text: string; ts: number };

export default function MessengerTestClient() {
  const [pageToken, setPageToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selected, setSelected] = useState<Msg | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('fb_page_token');
    if (saved) { setPageToken(saved); setTokenSaved(true); }
  }, []);

  const saveToken = () => {
    localStorage.setItem('fb_page_token', pageToken);
    setTokenSaved(true);
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messenger/messages');
      const data = await res.json();
      if (Array.isArray(data)) setMessages([...data].reverse());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMessages();
    const id = setInterval(fetchMessages, 5000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  const clearMessages = async () => {
    await fetch('/api/messenger/messages', { method: 'DELETE' });
    setMessages([]);
    setSelected(null);
    setSendResult(null);
  };

  const handleSelect = (msg: Msg) => {
    setSelected(msg);
    setSendResult(null);
    setReply('');
  };

  const handleSend = async () => {
    if (!selected || !reply.trim() || !pageToken.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/messenger/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selected.senderId, message: reply.trim(), pageToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendResult({ ok: true, msg: `Message envoyé avec tag HUMAN_AGENT (ID: ${data.messageId})` });
        setReply('');
      } else {
        setSendResult({ ok: false, msg: data.error || 'Erreur inconnue' });
      }
    } catch {
      setSendResult({ ok: false, msg: 'Erreur réseau, réessayez' });
    } finally {
      setSending(false);
    }
  };

  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/webhooks/facebook`
      : 'https://dms.yelha.net/api/webhooks/facebook';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${ORANGE}20` }}
        >
          <MessageCircle className="w-5 h-5" style={{ color: ORANGE }} />
        </div>
        <div>
          <h1 className="font-mono font-bold text-white text-lg">Test Human Agent — Messenger</h1>
          <p className="font-mono text-xs text-white/30">
            Interface de démonstration pour la revue Meta
          </p>
        </div>
      </div>

      {/* Setup */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
        <h2 className="font-mono text-xs font-semibold text-white/40 uppercase tracking-wider">
          Configuration Webhook
        </h2>

        <div>
          <label className="block font-mono text-xs text-white/40 mb-1.5">
            URL Webhook — à coller dans Meta Developer Console
          </label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
            <code className="font-mono text-xs text-orange-400 flex-1 break-all select-all">
              {webhookUrl}
            </code>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-xs text-white/40 mb-1.5">
              Verify Token (variable Vercel)
            </label>
            <div className="px-3 py-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
              <code className="font-mono text-xs text-white/30">FACEBOOK_VERIFY_TOKEN</code>
            </div>
          </div>
          <div>
            <label className="block font-mono text-xs text-white/40 mb-1.5">
              Événement à activer dans Meta
            </label>
            <div className="px-3 py-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
              <code className="font-mono text-xs text-white/30">messages</code>
            </div>
          </div>
        </div>

        <div>
          <label className="block font-mono text-xs text-white/40 mb-1.5">
            Page Access Token{' '}
            <span className="text-white/20">(Facebook Developers → Messenger → Access Tokens)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pageToken}
              onChange={(e) => { setPageToken(e.target.value); setTokenSaved(false); }}
              placeholder="EAAxxxxxxxxxxxx..."
              className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-orange-500/40"
            />
            <button
              onClick={saveToken}
              className="px-4 py-2.5 rounded-xl font-mono text-xs font-semibold text-white transition-all hover:opacity-90 flex items-center gap-2"
              style={{ background: tokenSaved ? '#22c55e' : ORANGE }}
            >
              {tokenSaved ? <Check className="w-3.5 h-3.5" /> : null}
              {tokenSaved ? 'Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Messages reçus */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
            <h2 className="font-mono text-sm font-semibold text-white">Messages reçus</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchMessages}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-all"
                title="Actualiser"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={clearMessages}
                className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Vider"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${ORANGE}10` }}
              >
                <MessageCircle className="w-5 h-5 text-white/20" />
              </div>
              <p className="font-mono text-sm text-white/20">En attente de messages…</p>
              <p className="font-mono text-xs text-white/10">
                Envoyez un message à votre Page Facebook
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04] overflow-y-auto max-h-96">
              {messages.map((msg, i) => (
                <button
                  key={`${msg.senderId}-${msg.ts}-${i}`}
                  onClick={() => handleSelect(msg)}
                  className={`w-full text-left px-4 py-3 hover:bg-white/[0.03] transition-colors ${
                    selected?.ts === msg.ts && selected?.senderId === msg.senderId
                      ? 'bg-orange-500/10 border-l-2 border-orange-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white/30" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[10px] text-white/30 mb-0.5 truncate">
                        PSID: {msg.senderId}
                      </p>
                      <p className="font-mono text-sm text-white leading-snug">{msg.text}</p>
                      <p className="font-mono text-[10px] text-white/20 mt-1">
                        {new Date(msg.ts).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Répondre */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
            <h2 className="font-mono text-sm font-semibold text-white">Réponse Agent Humain</h2>
          </div>

          <div className="p-4 flex-1 flex flex-col">
            {selected ? (
              <div className="flex flex-col gap-4 flex-1">
                <div>
                  <label className="block font-mono text-xs text-white/40 mb-1.5">Destinataire</label>
                  <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/[0.06]">
                    <code className="font-mono text-xs text-orange-400 break-all">
                      {selected.senderId}
                    </code>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs text-white/40 mb-1.5">
                    Message client
                  </label>
                  <div className="px-3 py-2 rounded-xl bg-black/30 border border-white/[0.06]">
                    <p className="font-mono text-xs text-white/50 leading-relaxed">{selected.text}</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="block font-mono text-xs text-white/40 mb-1.5">
                    Votre réponse
                  </label>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    placeholder="Bonjour, un agent humain prend en charge votre demande…"
                    className="w-full flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm font-mono text-white placeholder-white/20 focus:outline-none focus:border-orange-500/40 resize-none"
                  />
                </div>

                <div className="rounded-xl p-3 border border-white/[0.06] bg-white/[0.02]">
                  <p className="font-mono text-[10px] text-white/30 leading-relaxed">
                    Tag envoyé :{' '}
                    <span className="text-orange-400 font-semibold">HUMAN_AGENT</span>
                    <br />
                    Permet de répondre jusqu&apos;à 7 jours après le message client.
                  </p>
                </div>

                {sendResult && (
                  <div
                    className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-mono ${
                      sendResult.ok
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border border-red-500/20 text-red-400'
                    }`}
                  >
                    {sendResult.ok ? (
                      <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="break-all">{sendResult.msg}</span>
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={sending || !reply.trim() || !pageToken.trim()}
                  className="w-full py-2.5 rounded-xl font-mono text-sm font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: ORANGE }}
                >
                  {sending ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Envoyer via HUMAN_AGENT
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-8">
                <p className="font-mono text-sm text-white/20">
                  Sélectionnez un message à gauche
                </p>
                <p className="font-mono text-xs text-white/10">
                  Puis rédigez votre réponse ici
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
