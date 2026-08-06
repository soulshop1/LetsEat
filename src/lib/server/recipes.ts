import type { Database } from 'better-sqlite3';
import { ulid } from 'ulid';
import { parseIngredientLine } from '$lib/ingredient-parse';

export interface RecipeInput {
	title: string;
	description: string;
	courseId: string | null;
	servings: number | null;
	servingsUnit: string;
	prepMin: number | null;
	cookMin: number | null;
	notes: string;
	sourceName: string;
	sourceUrl: string;
	/** One ingredient per line; "# Heading" lines become section headers. */
	ingredientsText: string;
	/** One step per line; "# Heading" lines become section headers. */
	stepsText: string;
	/** Comma-separated tag names. */
	tagsText: string;
}

function nowIso(): string {
	return new Date().toISOString();
}

function splitLines(text: string): string[] {
	return text
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
}

function parseTags(tagsText: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const t of tagsText.split(',')) {
		const name = t.trim().toLowerCase();
		if (name && !seen.has(name)) {
			seen.add(name);
			out.push(name);
		}
	}
	return out;
}

function writeChildren(db: Database, recipeId: string, input: RecipeInput): void {
	db.prepare('DELETE FROM ingredients WHERE recipe_id = ?').run(recipeId);
	db.prepare('DELETE FROM steps WHERE recipe_id = ?').run(recipeId);
	db.prepare('DELETE FROM recipe_tags WHERE recipe_id = ?').run(recipeId);

	const insIngredient = db.prepare(
		`INSERT INTO ingredients (id, recipe_id, position, raw_text, qty, unit, item, is_heading)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	);
	splitLines(input.ingredientsText).forEach((line, i) => {
		const p = parseIngredientLine(line);
		insIngredient.run(ulid(), recipeId, i + 1, p.raw, p.qty, p.unit, p.item, p.isHeading ? 1 : 0);
	});

	const insStep = db.prepare(
		`INSERT INTO steps (id, recipe_id, position, body, is_heading) VALUES (?, ?, ?, ?, ?)`
	);
	splitLines(input.stepsText).forEach((line, i) => {
		const isHeading = line.startsWith('#');
		insStep.run(ulid(), recipeId, i + 1, line.replace(/^#+\s*/, ''), isHeading ? 1 : 0);
	});

	const insTag = db.prepare(`INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)`);
	const getTag = db.prepare(`SELECT id FROM tags WHERE name = ?`);
	const linkTag = db.prepare(`INSERT INTO recipe_tags (recipe_id, tag_id) VALUES (?, ?)`);
	for (const name of parseTags(input.tagsText)) {
		insTag.run(ulid(), name);
		const tag = getTag.get(name) as { id: string };
		linkTag.run(recipeId, tag.id);
	}
}

/** Rebuilds the single FTS row for a recipe. Call inside the same transaction as writes. */
export function refreshFts(db: Database, recipeId: string): void {
	db.prepare('DELETE FROM recipes_fts WHERE recipe_id = ?').run(recipeId);
	const r = db
		.prepare('SELECT title, description, notes FROM recipes WHERE id = ?')
		.get(recipeId) as { title: string; description: string; notes: string } | undefined;
	if (!r) return;
	const ing = db
		.prepare(
			`SELECT group_concat(raw_text, char(10)) AS t FROM ingredients WHERE recipe_id = ? AND is_heading = 0`
		)
		.get(recipeId) as { t: string | null };
	const stp = db
		.prepare(
			`SELECT group_concat(body, char(10)) AS t FROM steps WHERE recipe_id = ? AND is_heading = 0`
		)
		.get(recipeId) as { t: string | null };
	const tgs = db
		.prepare(
			`SELECT group_concat(t.name, ' ') AS t FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
			 WHERE rt.recipe_id = ?`
		)
		.get(recipeId) as { t: string | null };
	db.prepare(
		`INSERT INTO recipes_fts (recipe_id, title, description, notes, ingredients_text, steps_text, tags_text)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(recipeId, r.title, r.description, r.notes, ing.t ?? '', stp.t ?? '', tgs.t ?? '');
}

export function createRecipe(db: Database, input: RecipeInput): string {
	const id = ulid();
	db.transaction(() => {
		const now = nowIso();
		db.prepare(
			`INSERT INTO recipes (id, title, description, course_id, servings, servings_unit,
			   prep_min, cook_min, notes, source_name, source_url, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			id,
			input.title,
			input.description,
			input.courseId,
			input.servings,
			input.servingsUnit,
			input.prepMin,
			input.cookMin,
			input.notes,
			input.sourceName,
			input.sourceUrl,
			now,
			now
		);
		writeChildren(db, id, input);
		refreshFts(db, id);
	})();
	return id;
}

export function updateRecipe(db: Database, id: string, input: RecipeInput): void {
	db.transaction(() => {
		db.prepare(
			`UPDATE recipes SET title = ?, description = ?, course_id = ?, servings = ?,
			   servings_unit = ?, prep_min = ?, cook_min = ?, notes = ?, source_name = ?,
			   source_url = ?, updated_at = ? WHERE id = ?`
		).run(
			input.title,
			input.description,
			input.courseId,
			input.servings,
			input.servingsUnit,
			input.prepMin,
			input.cookMin,
			input.notes,
			input.sourceName,
			input.sourceUrl,
			nowIso(),
			id
		);
		writeChildren(db, id, input);
		refreshFts(db, id);
	})();
}

/** Deletes the recipe row (children cascade) and its FTS row. Photo files are the caller's job. */
export function deleteRecipe(db: Database, id: string): void {
	db.transaction(() => {
		db.prepare('DELETE FROM recipes_fts WHERE recipe_id = ?').run(id);
		db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
	})();
}

/** Turns user search text into an FTS5 prefix query: each word must match as a prefix. */
export function ftsQuery(userText: string): string {
	return userText
		.split(/\s+/)
		.map((w) => w.replace(/["*]/g, ''))
		.filter((w) => w.length > 0)
		.map((w) => `"${w}"*`)
		.join(' ');
}
