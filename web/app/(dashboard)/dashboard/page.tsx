import Link from "next/link";
import { getRequestUserId } from "@/lib/auth-guest";
import { getCounts } from "@/lib/db";

export default async function DashboardPage() {
  let counts = { datasets: 0, stressRuns: 0, analyses: 0 };
  try {
    const userId = await getRequestUserId();
    counts = await getCounts(userId);
  } catch {
    // no db
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] via-[var(--surface)] to-[var(--surface-elevated)] p-8 md:p-10">
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Risk Intelligence Platform
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] md:text-3xl">
            Capital Markets AI Lab
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            Upload financial data, run stress scenarios, analyze 10-K disclosures, and generate executive briefings—all in one workspace.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-40 w-64 bg-gradient-to-bl from-[var(--accent)]/10 to-transparent rounded-bl-full" aria-hidden />
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Your workspace
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Datasets"
            value={counts.datasets}
            sublabel="Financial data uploaded"
          />
          <StatCard
            label="Stress runs"
            value={counts.stressRuns}
            sublabel="Scenarios executed"
          />
          <StatCard
            label="10-K analyses"
            value={counts.analyses}
            sublabel="Disclosure risk runs"
          />
          <StatCard
            label="Reports"
            value="—"
            sublabel="Executive briefings"
          />
        </div>
      </section>

      {/* Feature cards */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Capabilities
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <FeatureCard
            href="/dashboard/upload"
            icon={<IconUpload />}
            title="Upload data"
            description="Import CSV financials or 10-K PDFs. Data is parsed and stored for stress tests and disclosure analysis."
          />
          <FeatureCard
            href="/dashboard/stress"
            icon={<IconStress />}
            title="Stress tests"
            description="Run interest rate, revenue, liquidity, and volatility scenarios. Custom company inputs and scenario parameters."
          />
          <FeatureCard
            href="/dashboard/analysis"
            icon={<IconAnalysis />}
            title="10-K analysis"
            description="AI-powered disclosure risk and sentiment analysis on 10-K filings. Risk factors and regulatory keywords."
          />
          <FeatureCard
            href="/dashboard/reports"
            icon={<IconReport />}
            title="Reports"
            description="Generate executive risk briefings combining stress and disclosure results into a single PDF."
          />
        </div>
      </section>

      {/* Getting started */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-6">
        <h2 className="text-sm font-medium text-[var(--foreground)]">
          Getting started
        </h2>
        <ol className="mt-4 space-y-3 text-sm text-[var(--muted)]">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-xs font-medium text-[var(--accent)]">1</span>
            Upload CSV or 10-K PDF in <Link href="/dashboard/upload" className="text-[var(--accent)] hover:underline">Upload data</Link>.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-xs font-medium text-[var(--accent)]">2</span>
            Run stress scenarios in <Link href="/dashboard/stress" className="text-[var(--accent)] hover:underline">Stress tests</Link> (use a dataset or manual inputs).
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-xs font-medium text-[var(--accent)]">3</span>
            Run 10-K disclosure risk analysis in <Link href="/dashboard/analysis" className="text-[var(--accent)] hover:underline">10-K analysis</Link>.
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-xs font-medium text-[var(--accent)]">4</span>
            Generate executive briefs in <Link href="/dashboard/reports" className="text-[var(--accent)] hover:underline">Reports</Link>.
          </li>
        </ol>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: number | string;
  sublabel: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-5 transition-colors hover:bg-[var(--surface)]/80">
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{sublabel}</p>
    </div>
  );
}

function FeatureCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-6 transition-all hover:border-[var(--accent)]/40 hover:bg-[var(--surface)]/90"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--accent)] group-hover:bg-[var(--accent)]/20">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">
        {description}
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] group-hover:gap-2 transition-all">
        Open
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
    </Link>
  );
}

function IconUpload() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function IconStress() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function IconAnalysis() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
