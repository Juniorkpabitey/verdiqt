# Verdiqt — AI Justice Intelligence (Supabase BaaS)

Serverless AI-powered legal assistance platform for criminal defense workflows in Africa. The React frontend talks directly to **Supabase** for auth, database, storage, realtime, and Edge Functions — no custom backend server.

## Architecture

```
React SPA (Vite)
    │
    ├── Supabase Auth          → registration, login, sessions
    ├── Supabase Postgres      → cases, analyses, messages, profiles (RLS)
    ├── Supabase Storage       → evidence file uploads
    ├── Supabase Realtime      → live case status & analysis updates
    └── Edge Functions         → AI chat, analysis (API keys stay server-side)
```

| Layer | Responsibility |
|-------|----------------|
| **Frontend** | UI, client logic, document templates, direct Supabase queries |
| **Supabase Auth** | User registration, login, JWT sessions |
| **Supabase Postgres** | Criminal cases, AI outputs, audit logs, appointments |
| **Row Level Security** | Per-user and per-role data access |
| **Supabase Storage** | Secure evidence uploads |
| **Edge Functions** | AI summarization, classification, chat (OpenAI optional) |

## Core capabilities

- Supabase-authenticated users with role-aware RLS (`client`, `lawyer`, `admin`, `legal_aid`, `hr_monitor`, `researcher`)
- Case submission, AI analysis, legal document generation, and chatbot
- **Case intelligence workspace** — timeline extraction, entity extraction, fair-trial rights review, contradiction scanning
- **Human-in-the-loop review queue** for AI outputs before client/court use
- **Procedure pathway** assistant with African jurisdiction packs (GH, NG, KE, TZ, ZA)
- **Governance dashboard** — AI model registry, prompt registry, incident tracking
- **HR monitor** and **researcher** dashboards (role-gated)
- Evidence upload via Supabase Storage with custody chain logging
- Lawyer request and admin case assignment workflow
- Case-level messaging with realtime subscriptions
- Appointment scheduling
- Admin analytics, user role management, case monitoring, and logs
- Free trial credits consumed for AI analysis/chat by client role

## Local development

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

### Supabase setup

1. Create a Supabase project.
2. Run SQL in the Supabase SQL Editor:
   - **Fresh install / fix auth errors:** `supabase/schema_complete_reset.sql`  
     (drops and recreates all app tables — deletes case data, keeps auth users)
   - **Then run v2 platform migration:** `supabase/migrations/005_v2_intelligence_platform.sql`  
     (intelligence tables, jurisdiction packs, governance, extended roles)
   - Or run migrations `001` → `004` in order on a new project, then `005`.
3. Create the `evidence` storage bucket (included in reset script).
4. Deploy the Edge Function for AI:

```bash
# Install Supabase CLI, then:
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy ai-intelligence
supabase secrets set OPENAI_API_KEY=sk-...   # optional; demo mode without it
```

5. Register users via the app. `profiles` rows auto-seed via trigger on signup.
6. Promote at least one account to `admin`:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Optional roles for v2 dashboards:

```sql
update public.profiles set role = 'hr_monitor' where email = 'monitor@example.com';
update public.profiles set role = 'researcher' where email = 'research@example.com';
update public.profiles set role = 'legal_aid' where email = 'legalaid@example.com';
```

## App routes (v2)

| Route | Role | Purpose |
|-------|------|---------|
| `/app/cases/:id/intelligence` | case owner / lawyer / admin | Timeline, entities, rights, contradictions |
| `/app/reviews` | authenticated | Human review queue for AI outputs |
| `/app/pathway` | authenticated | Procedural pathway assistant |
| `/admin/governance` | admin | Model registry, prompts, incidents |
| `/monitor` | `hr_monitor`, `admin` | Fair-trial & governance monitoring |
| `/research` | `researcher`, `admin` | De-identified analytics |

## Deployment (Vercel)

Single Vercel project — frontend only:

| Setting | Value |
|---------|--------|
| Root Directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |

Environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Deploy Edge Functions to Supabase (not Vercel). Set `OPENAI_API_KEY` in Supabase function secrets for production AI.

## Security model

- No custom API server — no exposed backend routes
- Supabase RLS enforces strict per-user data access
- AI API keys live in Edge Function secrets, never in frontend code
- Document generation runs client-side (templates only); usage is audit-logged via RPC

## Notes

- Lawyer, legal aid, and admin routes require matching `profiles.role` values in Supabase.
- Without `OPENAI_API_KEY`, the AI Edge Function returns demo responses.
- Realtime is enabled for `cases`, `case_analyses`, and `messages` tables.
