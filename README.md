# AiReply — AI-Powered Messaging SaaS

Automatisez vos réponses WhatsApp et Telegram avec DeepSeek AI.  
Supporte l'arabe (Darija & MSA), le français, l'anglais, et 100+ langues.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Auth**: NextAuth.js (Google OAuth + Email/Password + 2FA TOTP)
- **Payments**: Chargily ePay v2 (DZD — Algerian payment gateway)
- **AI**: DeepSeek API (text) + OpenAI Whisper (audio transcription)
- **Messaging**: Twilio WhatsApp + Telegram Bot API
- **i18n**: next-intl (Français 🇫🇷, English 🇬🇧, Arabic 🇩🇿 with RTL)
- **Email**: Resend
- **Rate Limiting**: Upstash Redis

---

## Supported Platforms

| Platform | Status |
|----------|--------|
| WhatsApp (via Twilio) | ✅ Available |
| Telegram Bot API | ✅ Available |
| Instagram DM | 🔜 Coming Soon |
| Facebook Messenger | 🔜 Coming Soon |

---

## Token Plans (DZD)

| Plan | Tokens | Price |
|------|--------|-------|
| Starter | 500 | 1 590 DA |
| Business | 2 000 | 3 200 DA |
| Pro | 5 000 | 6 000 DA |
| Agency | 15 000 | 15 000 DA |

**Token cost**: 1 token per text message, 2 tokens per voice message, 0 for predefined keyword matches.

---

## Quick Start

### 1. Clone and install

```bash
cd YelhaDz
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string (pooled) |
| `DIRECT_URL` | Supabase direct connection (for migrations) |
| `NEXTAUTH_SECRET` | Random 32+ char secret (`openssl rand -base64 32`) |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth credentials |
| `CHARGILY_API_KEY` | Chargily ePay API key (test or live) |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` (sandbox) or your Business number |
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `OPENAI_API_KEY` | OpenAI API key (Whisper voice transcription) |
| `RESEND_API_KEY` | Resend transactional email key |
| `UPSTASH_REDIS_REST_URL/TOKEN` | Upstash Redis for rate limiting |
| `ENCRYPTION_KEY` | 64 hex chars (32 bytes) for AES-256-GCM |
| `NEXT_PUBLIC_APP_URL` | Your app URL (e.g. `https://aireply.app`) |

### 3. Set up the database

```bash
npm run db:push      # Apply schema (dev)
# or
npm run db:migrate   # Run migrations (prod)

npm run db:seed      # Create admin user + token packages
```

Default seed accounts:
- **Admin**: `admin@aireply.app` / `Admin@123456`
- **Demo**: `demo@aireply.app` / `Demo@123456`

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/fr`.

---

## Twilio WhatsApp Setup

1. Create a [Twilio account](https://twilio.com)
2. Activate the WhatsApp Sandbox (or apply for WhatsApp Business)
3. Set the webhook URL in Twilio console:  
   `https://yourdomain.com/api/webhooks/twilio`
4. When creating a WhatsApp connection in the dashboard, enter the phone number linked to your Twilio account (e.g. `+213xxxxxxxx`)

**Signature verification**: Twilio signs every webhook request with your Auth Token. The webhook validates this signature before processing.

---

## Telegram Bot Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot → copy the Bot Token
3. Add the connection in the dashboard — the webhook is registered automatically

---

## Chargily ePay Setup

1. Create an account at [chargily.com](https://chargily.com)
2. Copy your API key from the dashboard
3. Set `CHARGILY_API_KEY` in your `.env.local`
4. The webhook URL is automatically passed on each checkout: `https://yourdomain.com/api/webhooks/chargily`

**Signature verification**: Chargily signs webhooks via HMAC-SHA256 using your API key. The webhook verifies the `signature` header before crediting tokens.

---

## Deployment

Recommended: [Vercel](https://vercel.com)

```bash
vercel --prod
```

Set all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

Make sure to set `NEXTAUTH_URL` to your production URL.

---

## Project Structure

```
src/
├── app/
│   ├── [locale]/          # i18n routes (fr/en/ar)
│   │   ├── page.tsx       # Landing page
│   │   ├── auth/          # Sign in, sign up, verify, reset password
│   │   ├── dashboard/     # User dashboard
│   │   └── admin/         # Admin panel (ADMIN role only)
│   └── api/
│       ├── auth/          # NextAuth + register + 2FA + password reset
│       ├── connections/   # CRUD for WhatsApp/Telegram connections
│       ├── tokens/        # Package listing + Chargily purchase
│       ├── user/          # Profile, sessions, data export, account delete
│       ├── admin/         # Admin: system settings, waitlist
│       ├── waitlist/      # Coming-soon platform waitlist signup
│       └── webhooks/
│           ├── chargily/  # Payment confirmation → credit tokens
│           ├── twilio/    # WhatsApp messages (text/voice/image)
│           └── telegram/  # Telegram bot messages
├── lib/
│   ├── auth.ts            # NextAuth config
│   ├── chargily.ts        # Chargily ePay v2 client
│   ├── twilio.ts          # Twilio WhatsApp client
│   ├── deepseek.ts        # DeepSeek AI chat
│   ├── whisper.ts         # OpenAI Whisper transcription
│   ├── encryption.ts      # AES-256-GCM for bot tokens
│   ├── resend.ts          # Transactional emails
│   └── ratelimit.ts       # Upstash rate limiting
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── dashboard/         # Sidebar, navbar
│   ├── auth/              # Password strength meter
│   └── waitlist-form.tsx  # Coming-soon waitlist form
└── messages/              # i18n translations (fr/en/ar)
```
