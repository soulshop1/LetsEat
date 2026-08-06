import BetterSqlite3, { type Database } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { runMigrations } from './migrations';
import * as schema from './schema';

let sqlite: Database | null = null;
let orm: BetterSQLite3Database<typeof schema> | null = null;

/** Open (or create) a database file, apply pragmas and pending migrations. */
export function openDatabase(file: string): Database {
	const db = new BetterSqlite3(file);
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');
	runMigrations(db);
	return db;
}

export function dataDir(): string {
	return process.env.DATA_DIR ?? path.resolve('data');
}

export function photosDir(): string {
	return path.join(dataDir(), 'photos');
}

export function getSqlite(): Database {
	if (!sqlite) {
		fs.mkdirSync(photosDir(), { recursive: true });
		sqlite = openDatabase(path.join(dataDir(), 'letseat.db'));
	}
	return sqlite;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
	if (!orm) {
		orm = drizzle(getSqlite(), { schema });
	}
	return orm;
}
