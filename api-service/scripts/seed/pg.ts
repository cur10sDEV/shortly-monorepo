import { Pool } from 'pg'
import { hashPassword } from '../../src/api/v1/utils/password-manager.js'
import type { SeedLink } from './generator.js'

export function createPgPool(connectionString: string): Pool {
  return new Pool({ connectionString, max: 5 })
}

export async function resolveUserId(pool: Pool, email: string): Promise<string> {
  const res = await pool.query<{ id: string }>('SELECT id FROM "user" WHERE email = $1', [email])
  if (res.rows.length === 0) {
    throw new Error(`No user found for ${email}. Sign up via the UI first.`)
  }
  return res.rows[0].id
}

export async function wipeSeedLinks(pool: Pool, userId: string): Promise<number> {
  const res = await pool.query("DELETE FROM links WHERE user_id = $1 AND short_code LIKE 'seed%'", [userId])
  return res.rowCount ?? 0
}

export async function insertSeedLinks(
  pool: Pool,
  userId: string,
  links: SeedLink[],
): Promise<number[]> {
  // Returns the SERIAL ids in input order — the click docs reference these.
  const hashed = await hashPassword('demo1234')
  if (!hashed) throw new Error('argon2 hashing failed')
  const ids: number[] = []
  for (const l of links) {
    const res = await pool.query<{ id: number }>(
      `INSERT INTO links (short_code, long_url, password, expires_at, user_id, deleted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING id`,
      [
        l.short_code,
        l.long_url,
        l.state === 'password' ? hashed : null,
        l.expires_at,
        userId,
        l.deleted_at,
        l.created_at,
      ],
    )
    ids.push(res.rows[0].id)
  }
  return ids
}
