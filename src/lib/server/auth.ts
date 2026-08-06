import { hash, verify } from '@node-rs/argon2';
import type { Database } from 'better-sqlite3';
import { createHash, randomBytes } from 'node:crypto';
import { ulid } from 'ulid';

export const SESSION_COOKIE = 'session';
const SESSION_DAYS = 30;
const SESSION_RENEW_BELOW_DAYS = 15;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export const sessionCookieOptions = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	// LAN deployments run plain HTTP; a Secure cookie would never be sent.
	secure: false,
	maxAge: SESSION_DAYS * 24 * 60 * 60
} as const;

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex');
}

export function isSetUp(db: Database): boolean {
	return db.prepare(`SELECT 1 FROM settings WHERE key = 'password_hash'`).get() !== undefined;
}

export async function setPassword(db: Database, password: string): Promise<void> {
	const passwordHash = await hash(password, { algorithm: 2 /* Argon2id */ });
	db.prepare(
		`INSERT INTO settings (key, value) VALUES ('password_hash', ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`
	).run(passwordHash);
}

export async function verifyPassword(db: Database, password: string): Promise<boolean> {
	const row = db.prepare(`SELECT value FROM settings WHERE key = 'password_hash'`).get() as
		| { value: string }
		| undefined;
	if (!row) return false;
	return verify(row.value, password);
}

/** Creates a session and returns the raw token to place in the cookie. */
export function createSession(db: Database): string {
	const token = randomBytes(32).toString('base64url');
	const now = Date.now();
	db.prepare(
		`INSERT INTO sessions (id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?)`
	).run(
		ulid(),
		sha256(token),
		new Date(now).toISOString(),
		new Date(now + SESSION_DAYS * 86400_000).toISOString()
	);
	return token;
}

/** Returns true for a live session; slides expiry when it drops below the renew window. */
export function validateSession(db: Database, token: string): boolean {
	const row = db
		.prepare(`SELECT id, expires_at FROM sessions WHERE token_hash = ?`)
		.get(sha256(token)) as { id: string; expires_at: string } | undefined;
	if (!row) return false;
	const now = Date.now();
	const expiresAt = Date.parse(row.expires_at);
	if (expiresAt <= now) {
		db.prepare(`DELETE FROM sessions WHERE id = ?`).run(row.id);
		return false;
	}
	if (expiresAt - now < SESSION_RENEW_BELOW_DAYS * 86400_000) {
		db.prepare(`UPDATE sessions SET expires_at = ? WHERE id = ?`).run(
			new Date(now + SESSION_DAYS * 86400_000).toISOString(),
			row.id
		);
	}
	return true;
}

export function destroySession(db: Database, token: string): void {
	db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(sha256(token));
}

type Attempts = { failures: number; lockedUntil: number };
const attemptsByIp = new Map<string, Attempts>();

export function loginLockedFor(ip: string): number {
	const a = attemptsByIp.get(ip);
	if (!a) return 0;
	const remaining = a.lockedUntil - Date.now();
	return remaining > 0 ? remaining : 0;
}

export function recordLoginFailure(ip: string): void {
	const a = attemptsByIp.get(ip) ?? { failures: 0, lockedUntil: 0 };
	a.failures += 1;
	if (a.failures >= MAX_FAILURES) {
		a.lockedUntil = Date.now() + LOCKOUT_MS;
		a.failures = 0;
	}
	attemptsByIp.set(ip, a);
}

export function recordLoginSuccess(ip: string): void {
	attemptsByIp.delete(ip);
}
