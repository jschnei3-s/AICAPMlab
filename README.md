# Capital Markets AI Lab

AI-powered capital markets risk intelligence platform: upload financial data, run stress tests, analyze 10-K sentiment, and generate executive risk briefs.

## Phase 1 – Skeleton ✅

- **Auth**: Sign up / sign in via Supabase Auth
- **Upload interface**: Drag-and-drop CSV and PDF (financial statements, 10-K)
- **Dashboard**: Dark, minimal layout with sidebar (Dashboard, Upload, Stress tests, Reports)

## Phase 2 – Stress Engine ✅

- **Backend DB**: Vercel Postgres (Neon); schema in `web/lib/db/schema.sql`
- **Stress scenarios**: Interest rate +200bps, Revenue -20%, Liquidity freeze, Credit spread widening, Volatility spike
- **Calculations**: Interest expense, DSCR, capital ratio, liquidity runway, Monte Carlo VaR (95%)
- **Outputs**: Risk heatmap, capital deterioration chart, liquidity burn graph, fragility score (0–100)
- **Charts**: Recharts on the Stress tests page
- **Upload → DB**: File metadata and optional CSV-parsed metrics stored in Vercel Postgres; “Add sample dataset” for quick demos

## Phase 3 – 10-K NLP & disclosure risk ✅

- **PDF text extraction**: `pdf-parse` (PDFParse + getText) in API route; file downloaded from Supabase Storage.
- **OpenAI analysis**: GPT-4o-mini with structured JSON output: disclosure risk score (0–100), sentiment score, risk factor sentiment, regulatory keyword count, litigation mentions, risky paragraphs (excerpt + reason), executive summary.
- **Storage**: `disclosure_analyses` table in Vercel Postgres; each run stored with scores and full results JSON.
- **UI**: **10-K analysis** page: select uploaded PDF → Run analysis → view risk score, executive summary, risk factor sentiment, litigation mentions, highlighted risky excerpts.
- **Sidebar**: New “10-K analysis” link; dashboard shows “10-K analyses” count.

## Phase 4 – Executive PDF report ✅

- **Report content**: Company overview (key metrics), key financial risks (from stress + disclosure), stress test impact summary (scenario, fragility score, DSCR, liquidity runway), disclosure sentiment analysis (risk score + executive summary), recommended risk mitigation actions (template + context-aware).
- **PDF generation**: `@react-pdf/renderer`; single A4 page, professional typography and spacing.
- **API**: `POST /api/report` with optional `stressRunId` and `disclosureId`; uses latest run/analysis if omitted. Returns PDF attachment.
- **UI**: **Reports** page: optional dropdowns for stress run and 10-K analysis → **Generate PDF report** → download `Executive-Risk-Brief-{Company}-{date}.pdf`.
- **List APIs**: `GET /api/stress-runs` and `GET /api/disclosure-analyses` for the report form dropdowns.

## Setup

### 1. Supabase (Auth + file storage)

1. Create a project at [supabase.com](https://supabase.com).
2. In **Storage**, create a bucket named `uploads` (private). Add a policy so authenticated users can upload under their own folder, e.g.:
   - **Policy name**: Users can upload own files  
   - **Allowed operation**: INSERT  
   - **Policy**: `bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text`

### 2. Vercel Postgres (backend database)

1. In the [Vercel Dashboard](https://vercel.com), open your project (or link the `web` app).
2. Go to **Storage** → create a database → choose **Postgres** (Vercel Postgres or Neon).
3. Run the schema once (Vercel SQL or your provider’s SQL editor). Copy the contents of `web/lib/db/schema.sql` and execute it.
4. Pull env locally: `vercel env pull .env.local` (or add `POSTGRES_URL` to `.env.local` from the Vercel/Neon dashboard).

### 3. Web app

```bash
cd web
cp .env.local.example .env.local
# Add to .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   POSTGRES_URL=...   (or DATABASE_URL from Vercel/Neon)
#   OPENAI_API_KEY=... (for 10-K analysis)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, then:

- **Upload data**: Upload CSV/PDF; metrics are stored in Vercel Postgres (CSV can auto-parse revenue, debt, etc. if columns match).
- **Stress tests**: Choose a dataset (or “Add sample dataset”), pick a scenario, run, and view heatmap, capital deterioration, liquidity burn, and fragility score.
- **10-K analysis**: Upload a 10-K PDF in Upload data, then in 10-K analysis select the file and run analysis to get disclosure risk score, executive summary, litigation mentions, and risky excerpts.
- **Reports**: In Reports, optionally choose a stress run and/or 10-K analysis, then click **Generate PDF report** to download an executive risk brief (company overview, key risks, stress impact, disclosure summary, recommended actions).

## Tech stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind, Recharts, dark UI
- **Backend data**: Vercel Postgres (`@vercel/postgres`), server actions / API routes
- **Auth + files**: Supabase (Auth + Storage)

## Build plan

| Phase | Focus |
|-------|--------|
| 1 ✅ | Auth, upload UI, dashboard layout |
| 2 ✅ | Vercel Postgres, stress engine, Monte Carlo VaR, charts |
| 3 ✅ | 10-K PDF text extraction, OpenAI sentiment/risk analysis, disclosure score & UI |
| 4 ✅ | Executive PDF report: company overview, stress impact, disclosure analysis, recommendations; export via Reports page |
