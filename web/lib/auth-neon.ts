import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { hash, compare } from "bcryptjs";

const SESSION_COOKIE_NAME = "aicapm_session";
const SESSION_DAYS = 7;

export { SESSION_COOKIE_NAME };

const hasDb = () => !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);

export type SessionUser = {
  id: string;
  email: string;
};

/** Get current session user from cookie (Neon). Returns null if no valid session. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!hasDb()) return null;
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const { rows } = await sql`
      select u.id, u.email from sessions s
      join users u on u.id = s.user_id
      where s.token = ${token} and s.expires_at > now()
      limit 1
    `;
    const row = rows[0] as { id: string; email: string } | undefined;
    return row ? { id: row.id, email: row.email } : null;
  } catch {
    return null;
  }
}

/** Get user ID for the current request (from Neon session or guest). */
export async function getNeonUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}

/** Create a user and return the new user id. */
export async function createUser(email: string, password: string): Promise<{ id: string } | null> {
  if (!hasDb()) return null;
  const passwordHash = await hash(password, 10);
  try {
    const { rows } = await sql`
      insert into users (email, password_hash)
      values (${email.toLowerCase().trim()}, ${passwordHash})
      returning id
    `;
    return (rows[0] as { id: string }) ?? null;
  } catch {
    return null;
  }
}

/** Get user by email. */
export async function getUserByEmail(email: string): Promise<{ id: string; password_hash: string } | null> {
  if (!hasDb()) return null;
  const { rows } = await sql`
    select id, password_hash from users where email = ${email.toLowerCase().trim()} limit 1
  `;
  return (rows[0] as { id: string; password_hash: string }) ?? null;
}

/** Verify password and return user id if valid. */
export async function verifyLogin(email: string, password: string): Promise<string | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;
  const ok = await compare(password, user.password_hash);
  return ok ? user.id : null;
}

/** Create session and return token. */
export async function createSession(userId: string): Promise<string | null> {
  if (!hasDb()) return null;
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  try {
    await sql`
      insert into sessions (user_id, token, expires_at)
      values (${userId}, ${token}, ${expiresAt})
    `;
    return token;
  } catch {
    return null;
  }
}

/** Delete session by token. */
export async function deleteSession(token: string): Promise<void> {
  if (!hasDb()) return;
  await sql`delete from sessions where token = ${token}`;
}
