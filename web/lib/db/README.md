# Database setup (Neon)

Sign-up and login require the `users` and `sessions` tables in Neon.

## Run the schema in Neon

1. Open [Neon Console](https://console.neon.tech) and select your project.
2. Go to **SQL Editor**.
3. Paste and run **one** of the following:

### Option A: Auth only (minimal – just for sign-up/login)

Run [`schema-auth-only.sql`](./schema-auth-only.sql) to create only the `users` and `sessions` tables (and the UUID extension).

### Option B: Full schema (recommended)

Run [`schema.sql`](./schema.sql) to create all tables (uploads, financial_datasets, stress_runs, disclosure_analyses, users, sessions).

After the schema has been run successfully, try creating an account again.
