# Verona — Angelica Prototype

A working prototype of Angelica, the AI matchmaker at the heart of Verona. Full conversation engine with persistent portrait tracking in Supabase.

## What It Does

- **Conversation** — Angelica talks to users following the Verona design: dinner party test, one question at a time, three invisible phases (Trust → Hypothesis → Diffusion), invisible coaching.
- **Portrait tracking** — After every exchange, a background analysis call extracts signals and writes to the database: 200 individual dimensions (3 layers each), 50 partner dimensions, 50 relationship dimensions, 6 scores, 15 CQ dimensions, 20 personality parameters, hypotheses, fragments, silences, territory map, key moments, shared history, essential truth.
- **Adaptive personality** — Angelica's 20 personality parameters adjust based on the conversation analysis, stored per-user.
- **Portrait panel** — View the portrait building in real time from the UI.

## Setup (15 minutes)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **SQL Editor**
3. Paste the contents of `supabase/schema.sql` and run it
4. Go to **Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 2. Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. Create a new API key

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your keys:

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Deploy to Vercel

1. Push to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add all four environment variables
4. Deploy

Share the URL with anyone — they just talk.

## Database Schema

17 tables covering the full Verona data model:

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `sessions` | Conversation sessions |
| `messages` | Individual messages |
| `portrait_dimensions` | 200 individual dimensions (3 layers) |
| `partner_dimensions` | 50 partner image dimensions |
| `relationship_dimensions` | 50 relationship image dimensions |
| `scores` | 6 measurement scores (tracked over time) |
| `cq_dimensions` | 15 conversation quality dimensions |
| `personality_params` | 20 Angelica personality parameters |
| `territory_map` | Which areas explored, to what depth |
| `hypotheses` | Active/confirmed/discarded hypotheses |
| `fragments` | Things said once that might matter |
| `silences` | Topics consistently not raised |
| `key_moments` | Conversations that mattered most |
| `shared_history` | Inside references, play moments |
| `essential_truth` | The emerging core understanding |
| `meta_layer` | Trust calibration — how much to trust the data |

Row Level Security is enabled on all tables — each user can only access their own data.

## Architecture

```
Browser → Next.js API routes → Anthropic Claude (conversation)
                             → Anthropic Claude (portrait analysis)
                             → Supabase (persistent storage)
```

Two API calls per user message:
1. **Conversation** — Angelica's response (portrait context injected into system prompt)
2. **Analysis** — Background portrait update (extracts signals, writes to all relevant tables)

## Cost

- ~$0.01-0.03 per message in API usage (conversation + analysis)
- ~$0.30-0.50 per full demo conversation (20 exchanges)
- Supabase free tier handles prototype scale easily

- Deploy
