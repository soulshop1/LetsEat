import { describe, expect, it } from 'vitest';
import { openDatabase } from './db';
import {
	createSession,
	destroySession,
	isSetUp,
	loginLockedFor,
	recordLoginFailure,
	recordLoginSuccess,
	setPassword,
	validateSession,
	verifyPassword
} from './auth';

describe('password', () => {
	it('is unset on a fresh database, then verifies after setup', async () => {
		const db = openDatabase(':memory:');
		expect(isSetUp(db)).toBe(false);
		expect(await verifyPassword(db, 'anything')).toBe(false);
		await setPassword(db, 'correct horse battery');
		expect(isSetUp(db)).toBe(true);
		expect(await verifyPassword(db, 'correct horse battery')).toBe(true);
		expect(await verifyPassword(db, 'wrong')).toBe(false);
	});

	it('stores an Argon2 hash, not the password', async () => {
		const db = openDatabase(':memory:');
		await setPassword(db, 'supersecret');
		const row = db.prepare(`SELECT value FROM settings WHERE key = 'password_hash'`).get() as {
			value: string;
		};
		expect(row.value).toMatch(/^\$argon2id\$/);
		expect(row.value).not.toContain('supersecret');
	});
});

describe('sessions', () => {
	it('round-trips create → validate → destroy', () => {
		const db = openDatabase(':memory:');
		const token = createSession(db);
		expect(validateSession(db, token)).toBe(true);
		destroySession(db, token);
		expect(validateSession(db, token)).toBe(false);
	});

	it('rejects unknown and expired tokens', () => {
		const db = openDatabase(':memory:');
		expect(validateSession(db, 'not-a-real-token')).toBe(false);
		const token = createSession(db);
		db.prepare(`UPDATE sessions SET expires_at = '2000-01-01T00:00:00Z'`).run();
		expect(validateSession(db, token)).toBe(false);
		expect(db.prepare('SELECT COUNT(*) AS n FROM sessions').get()).toEqual({ n: 0 });
	});

	it('stores only a hash of the token', () => {
		const db = openDatabase(':memory:');
		const token = createSession(db);
		const row = db.prepare('SELECT token_hash FROM sessions').get() as { token_hash: string };
		expect(row.token_hash).not.toBe(token);
		expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe('login rate limiting', () => {
	it('locks out after 5 failures and clears on success', () => {
		const ip = `test-ip-${Math.random()}`;
		expect(loginLockedFor(ip)).toBe(0);
		for (let i = 0; i < 4; i++) recordLoginFailure(ip);
		expect(loginLockedFor(ip)).toBe(0);
		recordLoginFailure(ip);
		expect(loginLockedFor(ip)).toBeGreaterThan(0);
		recordLoginSuccess(ip);
		expect(loginLockedFor(ip)).toBe(0);
	});
});
