import type { Database } from 'better-sqlite3';

/**
 * Ordered, append-only migrations applied via PRAGMA user_version.
 * Never edit a shipped migration — add a new one.
 */
export const migrations: string[] = [
	// v1 — full schema from SPEC.md §8
	`
	CREATE TABLE settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);

	CREATE TABLE sessions (
		id TEXT PRIMARY KEY,
		token_hash TEXT NOT NULL UNIQUE,
		created_at TEXT NOT NULL,
		expires_at TEXT NOT NULL
	);

	CREATE TABLE courses (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL COLLATE NOCASE UNIQUE,
		position INTEGER NOT NULL
	);

	CREATE TABLE recipes (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		description TEXT NOT NULL DEFAULT '',
		course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
		servings REAL,
		servings_unit TEXT NOT NULL DEFAULT 'servings',
		prep_min INTEGER,
		cook_min INTEGER,
		total_min INTEGER GENERATED ALWAYS AS (
			CASE WHEN prep_min IS NULL AND cook_min IS NULL THEN NULL
			     ELSE COALESCE(prep_min, 0) + COALESCE(cook_min, 0) END
		) VIRTUAL,
		rating INTEGER NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
		is_favorite INTEGER NOT NULL DEFAULT 0,
		notes TEXT NOT NULL DEFAULT '',
		source_name TEXT NOT NULL DEFAULT '',
		source_url TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);
	CREATE INDEX idx_recipes_course ON recipes(course_id);
	CREATE INDEX idx_recipes_updated ON recipes(updated_at);

	CREATE TABLE ingredients (
		id TEXT PRIMARY KEY,
		recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
		position INTEGER NOT NULL,
		raw_text TEXT NOT NULL,
		qty REAL,
		unit TEXT,
		item TEXT,
		is_heading INTEGER NOT NULL DEFAULT 0
	);
	CREATE INDEX idx_ingredients_recipe ON ingredients(recipe_id);

	CREATE TABLE steps (
		id TEXT PRIMARY KEY,
		recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
		position INTEGER NOT NULL,
		body TEXT NOT NULL,
		is_heading INTEGER NOT NULL DEFAULT 0
	);
	CREATE INDEX idx_steps_recipe ON steps(recipe_id);

	CREATE TABLE photos (
		id TEXT PRIMARY KEY,
		recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
		position INTEGER NOT NULL,
		filename TEXT NOT NULL,
		width INTEGER NOT NULL,
		height INTEGER NOT NULL,
		created_at TEXT NOT NULL
	);
	CREATE INDEX idx_photos_recipe ON photos(recipe_id);

	CREATE TABLE tags (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL COLLATE NOCASE UNIQUE
	);

	CREATE TABLE recipe_tags (
		recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
		tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
		PRIMARY KEY (recipe_id, tag_id)
	);

	CREATE TABLE cook_log (
		id TEXT PRIMARY KEY,
		recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
		cooked_on TEXT NOT NULL,
		note TEXT
	);
	CREATE INDEX idx_cook_log_recipe ON cook_log(recipe_id);

	-- Standalone FTS index, kept in sync by the app in the same transaction
	-- as any recipe write (one FTS row per recipe).
	CREATE VIRTUAL TABLE recipes_fts USING fts5(
		recipe_id UNINDEXED,
		title,
		description,
		notes,
		ingredients_text,
		steps_text,
		tags_text
	);

	INSERT INTO courses (id, name, position) VALUES
		('01000000000000000000000001', 'Breakfast', 1),
		('01000000000000000000000002', 'Lunch', 2),
		('01000000000000000000000003', 'Dinner', 3),
		('01000000000000000000000004', 'Dessert', 4),
		('01000000000000000000000005', 'Snack', 5),
		('01000000000000000000000006', 'Side', 6),
		('01000000000000000000000007', 'Drink', 7);
	`
];

export function runMigrations(db: Database): void {
	const current = db.pragma('user_version', { simple: true }) as number;
	for (let i = current; i < migrations.length; i++) {
		db.transaction(() => {
			db.exec(migrations[i]);
			db.pragma(`user_version = ${i + 1}`);
		})();
	}
}
