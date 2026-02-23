import { createClient } from "@/lib/supabase/server";
import { getCounts } from "@/lib/db";

export default async function DashboardPage() {
  let counts = { datasets: 0, stressRuns: 0, analyses: 0 };
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) counts = await getCounts(user.id);
  } catch {
    // no db or auth
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of your risk intelligence workspace.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Data uploads" value={String(counts.datasets)} subtitle="Financial datasets" />
        <Card title="Stress runs" value={String(counts.stressRuns)} subtitle="Scenarios executed" />
        <Card title="10-K analyses" value={String(counts.analyses)} subtitle="Disclosure risk runs" />
        <Card title="Reports" value="—" subtitle="Executive briefings" />
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6">
        <h2 className="text-sm font-medium text-zinc-400">Getting started</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-zinc-500">
          <li>Upload CSV financial data or a 10-K PDF from Upload data.</li>
          <li>Run stress scenarios in Stress tests.</li>
          <li>Run 10-K disclosure risk analysis in 10-K analysis.</li>
          <li>Generate executive risk briefs in Reports (Phase 4).</li>
        </ul>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold text-zinc-100">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
    </div>
  );
}
