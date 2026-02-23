import { sql } from "@vercel/postgres";

const hasConfig = () =>
  !!(
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL
  );

export type UploadRow = {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  file_size_bytes: number | null;
  created_at: Date;
};

export type FinancialDatasetRow = {
  id: string;
  user_id: string;
  upload_id: string | null;
  name: string | null;
  revenue: number | null;
  ebitda: number | null;
  debt: number | null;
  cash: number | null;
  equity: number | null;
  working_capital: number | null;
  raw_metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

export type StressRunRow = {
  id: string;
  user_id: string;
  dataset_id: string | null;
  scenario_name: string;
  scenario_params: Record<string, unknown>;
  results: Record<string, unknown>;
  fragility_score: number | null;
  created_at: Date;
};

export type DisclosureAnalysisRow = {
  id: string;
  user_id: string;
  upload_id: string | null;
  file_name: string | null;
  disclosure_risk_score: number | null;
  sentiment_score: number | null;
  results: Record<string, unknown>;
  created_at: Date;
};

export async function getUploadById(id: string, userId: string): Promise<UploadRow | null> {
  if (!hasConfig()) return null;
  const { rows } = await sql`select id, user_id, file_name, file_type, storage_path, file_size_bytes, created_at from uploads where id = ${id} and user_id = ${userId}`;
  return (rows as UploadRow[])?.[0] ?? null;
}

export async function getPdfUploadsByUserId(userId: string): Promise<UploadRow[]> {
  if (!hasConfig()) return [];
  const { rows } = await sql`select id, user_id, file_name, file_type, storage_path, file_size_bytes, created_at from uploads where user_id = ${userId} and file_type = 'pdf' order by created_at desc`;
  return (rows as UploadRow[]) ?? [];
}

export async function getDatasetsByUserId(userId: string): Promise<FinancialDatasetRow[]> {
  if (!hasConfig()) return [];
  const { rows } = await sql`select id, user_id, upload_id, name, revenue, ebitda, debt, cash, equity, working_capital, coalesce(raw_metadata::text,'{}')::jsonb as raw_metadata, created_at, updated_at from financial_datasets where user_id = ${userId} order by created_at desc`;
  return (rows as FinancialDatasetRow[]) ?? [];
}

export async function getDatasetById(
  id: string,
  userId: string
): Promise<FinancialDatasetRow | null> {
  if (!hasConfig()) return null;
  const { rows } = await sql`select id, user_id, upload_id, name, revenue, ebitda, debt, cash, equity, working_capital, coalesce(raw_metadata::text,'{}')::jsonb as raw_metadata, created_at, updated_at from financial_datasets where id = ${id} and user_id = ${userId}`;
  const row = (rows as FinancialDatasetRow[])?.[0];
  return row ?? null;
}

export async function insertUpload(
  userId: string,
  file_name: string,
  file_type: string,
  storage_path: string,
  file_size_bytes: number | null
) {
  if (!hasConfig()) return null;
  const { rows } = await sql`
    insert into uploads (user_id, file_name, file_type, storage_path, file_size_bytes)
    values (${userId}, ${file_name}, ${file_type}, ${storage_path}, ${file_size_bytes})
    returning id, user_id, file_name, file_type, storage_path, file_size_bytes, created_at
  `;
  return (rows[0] as UploadRow) ?? null;
}

export async function insertFinancialDataset(
  userId: string,
  opts: {
    upload_id?: string | null;
    name?: string | null;
    revenue?: number | null;
    ebitda?: number | null;
    debt?: number | null;
    cash?: number | null;
    equity?: number | null;
    working_capital?: number | null;
    raw_metadata?: Record<string, unknown>;
  }
) {
  if (!hasConfig()) return null;
  const { rows } = await sql`
    insert into financial_datasets (user_id, upload_id, name, revenue, ebitda, debt, cash, equity, working_capital, raw_metadata, updated_at)
    values (
      ${userId},
      ${opts.upload_id ?? null},
      ${opts.name ?? null},
      ${opts.revenue ?? null},
      ${opts.ebitda ?? null},
      ${opts.debt ?? null},
      ${opts.cash ?? null},
      ${opts.equity ?? null},
      ${opts.working_capital ?? null},
      ${JSON.stringify(opts.raw_metadata ?? {})}::jsonb,
      now()
    )
    returning id, user_id, upload_id, name, revenue, ebitda, debt, cash, equity, working_capital, raw_metadata, created_at, updated_at
  `;
  return (rows[0] as FinancialDatasetRow) ?? null;
}

export async function insertStressRun(
  userId: string,
  dataset_id: string | null,
  scenario_name: string,
  scenario_params: Record<string, unknown>,
  results: Record<string, unknown>,
  fragility_score: number | null
) {
  if (!hasConfig()) return null;
  const { rows } = await sql`
    insert into stress_runs (user_id, dataset_id, scenario_name, scenario_params, results, fragility_score)
    values (${userId}, ${dataset_id}, ${scenario_name}, ${JSON.stringify(scenario_params)}::jsonb, ${JSON.stringify(results)}::jsonb, ${fragility_score})
    returning id, user_id, dataset_id, scenario_name, scenario_params, results, fragility_score, created_at
  `;
  return (rows[0] as StressRunRow) ?? null;
}

export async function getStressRunById(id: string, userId: string): Promise<StressRunRow | null> {
  if (!hasConfig()) return null;
  const { rows } = await sql`
    select id, user_id, dataset_id, scenario_name, scenario_params, coalesce(results::text,'{}')::jsonb as results, fragility_score, created_at
    from stress_runs where id = ${id} and user_id = ${userId}
  `;
  return (rows as StressRunRow[])?.[0] ?? null;
}

export async function getStressRunsByUserId(userId: string): Promise<StressRunRow[]> {
  if (!hasConfig()) return [];
  const { rows } = await sql`
    select id, user_id, dataset_id, scenario_name, scenario_params, coalesce(results::text,'{}')::jsonb as results, fragility_score, created_at
    from stress_runs where user_id = ${userId} order by created_at desc
  `;
  return (rows as StressRunRow[]) ?? [];
}

export async function insertDisclosureAnalysis(
  userId: string,
  upload_id: string | null,
  file_name: string | null,
  disclosure_risk_score: number | null,
  sentiment_score: number | null,
  results: Record<string, unknown>
) {
  if (!hasConfig()) return null;
  const { rows } = await sql`
    insert into disclosure_analyses (user_id, upload_id, file_name, disclosure_risk_score, sentiment_score, results)
    values (${userId}, ${upload_id}, ${file_name}, ${disclosure_risk_score}, ${sentiment_score}, ${JSON.stringify(results)}::jsonb)
    returning id, user_id, upload_id, file_name, disclosure_risk_score, sentiment_score, results, created_at
  `;
  return (rows[0] as DisclosureAnalysisRow) ?? null;
}

export async function getDisclosureAnalysisById(id: string, userId: string): Promise<DisclosureAnalysisRow | null> {
  if (!hasConfig()) return null;
  const { rows } = await sql`
    select id, user_id, upload_id, file_name, disclosure_risk_score, sentiment_score, coalesce(results::text,'{}')::jsonb as results, created_at
    from disclosure_analyses where id = ${id} and user_id = ${userId}
  `;
  return (rows as DisclosureAnalysisRow[])?.[0] ?? null;
}

export async function getDisclosureAnalysesByUserId(userId: string): Promise<DisclosureAnalysisRow[]> {
  if (!hasConfig()) return [];
  const { rows } = await sql`
    select id, user_id, upload_id, file_name, disclosure_risk_score, sentiment_score, coalesce(results::text,'{}')::jsonb as results, created_at
    from disclosure_analyses where user_id = ${userId} order by created_at desc
  `;
  return (rows as DisclosureAnalysisRow[]) ?? [];
}

export async function getCounts(userId: string): Promise<{
  datasets: number;
  stressRuns: number;
  analyses: number;
}> {
  if (!hasConfig()) return { datasets: 0, stressRuns: 0, analyses: 0 };
  const dr = (await sql`select count(*)::int as c from financial_datasets where user_id = ${userId}`).rows as { c: number }[];
  const sr = (await sql`select count(*)::int as c from stress_runs where user_id = ${userId}`).rows as { c: number }[];
  const ar = (await sql`select count(*)::int as c from disclosure_analyses where user_id = ${userId}`).rows as { c: number }[];
  return {
    datasets: dr?.[0]?.c ?? 0,
    stressRuns: sr?.[0]?.c ?? 0,
    analyses: ar?.[0]?.c ?? 0,
  };
}
