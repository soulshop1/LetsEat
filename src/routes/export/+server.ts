import { getSqlite } from '$lib/server/db';
import { photoFilePath } from '$lib/server/photos';
import { zipSync, strToU8 } from 'fflate';
import fs from 'node:fs';
import type { RequestHandler } from './$types';

/** Full-library export: recipes.json plus every photo, in one zip. */
export const GET: RequestHandler = () => {
	const db = getSqlite();

	const recipes = db.prepare('SELECT * FROM recipes ORDER BY created_at').all() as Record<
		string,
		unknown
	>[];
	const files: Record<string, Uint8Array> = {};

	const dump = recipes.map((r) => {
		const id = r.id as string;
		const photos = db
			.prepare('SELECT id, position, filename, width, height, created_at FROM photos WHERE recipe_id = ? ORDER BY position')
			.all(id) as { id: string; filename: string }[];
		for (const p of photos) {
			const file = photoFilePath(id, p.filename, 'cover');
			if (fs.existsSync(file)) {
				files[`photos/${id}/${p.filename}.webp`] = fs.readFileSync(file);
			}
		}
		return {
			...r,
			course: (db.prepare('SELECT name FROM courses WHERE id = ?').get(r.course_id as string) as
				| { name: string }
				| undefined)?.name ?? null,
			ingredients: db
				.prepare('SELECT position, raw_text, qty, unit, item, is_heading FROM ingredients WHERE recipe_id = ? ORDER BY position')
				.all(id),
			steps: db
				.prepare('SELECT position, body, is_heading FROM steps WHERE recipe_id = ? ORDER BY position')
				.all(id),
			tags: (db
				.prepare('SELECT t.name FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id WHERE rt.recipe_id = ? ORDER BY t.name')
				.all(id) as { name: string }[]).map((t) => t.name),
			cook_log: db
				.prepare('SELECT cooked_on, note FROM cook_log WHERE recipe_id = ? ORDER BY cooked_on')
				.all(id),
			photos
		};
	});

	files['recipes.json'] = strToU8(
		JSON.stringify(
			{
				app: 'lets-eat',
				format: 1,
				exported_at: new Date().toISOString(),
				courses: db.prepare('SELECT name, position FROM courses ORDER BY position').all(),
				recipes: dump
			},
			null,
			'\t'
		)
	);

	const zip = zipSync(files, { level: 6 });
	const date = new Date().toISOString().slice(0, 10);
	return new Response(new Uint8Array(zip), {
		headers: {
			'content-type': 'application/zip',
			'content-disposition': `attachment; filename="lets-eat-export-${date}.zip"`
		}
	});
};
