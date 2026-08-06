import { describe, expect, it } from 'vitest';
import { openDatabase } from './index';

describe('migrations', () => {
	it('creates the full v1 schema on a fresh database', () => {
		const db = openDatabase(':memory:');
		const tables = db
			.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
			.all()
			.map((r) => (r as { name: string }).name);
		for (const t of [
			'settings',
			'sessions',
			'courses',
			'recipes',
			'ingredients',
			'steps',
			'photos',
			'tags',
			'recipe_tags',
			'cook_log',
			'recipes_fts'
		]) {
			expect(tables).toContain(t);
		}
		expect(db.pragma('user_version', { simple: true })).toBe(1);
	});

	it('is idempotent — reopening does not reapply migrations', () => {
		const db = openDatabase(':memory:');
		expect(db.prepare('SELECT COUNT(*) AS n FROM courses').get()).toEqual({ n: 7 });
	});

	it('seeds default courses in order', () => {
		const db = openDatabase(':memory:');
		const names = db
			.prepare('SELECT name FROM courses ORDER BY position')
			.all()
			.map((r) => (r as { name: string }).name);
		expect(names).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Side', 'Drink']);
	});

	it('computes total_min from prep and cook, null when both null', () => {
		const db = openDatabase(':memory:');
		const insert = db.prepare(
			`INSERT INTO recipes (id, title, prep_min, cook_min, created_at, updated_at)
			 VALUES (?, ?, ?, ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
		);
		insert.run('r1', 'Both', 10, 20);
		insert.run('r2', 'Neither', null, null);
		insert.run('r3', 'Prep only', 15, null);
		const total = (id: string) =>
			(db.prepare('SELECT total_min FROM recipes WHERE id = ?').get(id) as {
				total_min: number | null;
			}).total_min;
		expect(total('r1')).toBe(30);
		expect(total('r2')).toBeNull();
		expect(total('r3')).toBe(15);
	});

	it('cascades recipe deletion to child rows', () => {
		const db = openDatabase(':memory:');
		db.prepare(
			`INSERT INTO recipes (id, title, created_at, updated_at)
			 VALUES ('r1', 'Soup', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
		).run();
		db.prepare(
			`INSERT INTO ingredients (id, recipe_id, position, raw_text) VALUES ('i1', 'r1', 1, '1 onion')`
		).run();
		db.prepare(`INSERT INTO steps (id, recipe_id, position, body) VALUES ('s1', 'r1', 1, 'Chop.')`).run();
		db.prepare(`DELETE FROM recipes WHERE id = 'r1'`).run();
		expect(db.prepare('SELECT COUNT(*) AS n FROM ingredients').get()).toEqual({ n: 0 });
		expect(db.prepare('SELECT COUNT(*) AS n FROM steps').get()).toEqual({ n: 0 });
	});

	it('supports full-text search through recipes_fts', () => {
		const db = openDatabase(':memory:');
		db.prepare(
			`INSERT INTO recipes_fts (recipe_id, title, description, notes, ingredients_text, steps_text, tags_text)
			 VALUES ('r1', 'Tom Kha Gai', '', '', 'coconut milk, galangal, chicken', 'Simmer the broth.', 'thai soup')`
		).run();
		const hit = db
			.prepare(`SELECT recipe_id FROM recipes_fts WHERE recipes_fts MATCH ?`)
			.get('galangal') as { recipe_id: string } | undefined;
		expect(hit?.recipe_id).toBe('r1');
		const miss = db
			.prepare(`SELECT recipe_id FROM recipes_fts WHERE recipes_fts MATCH ?`)
			.get('lasagna');
		expect(miss).toBeUndefined();
	});
});
