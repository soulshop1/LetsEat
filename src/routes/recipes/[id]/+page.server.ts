import { getSqlite } from '$lib/server/db';
import { deleteRecipe } from '$lib/server/recipes';
import { deleteRecipePhotos } from '$lib/server/photos';
import { error, redirect } from '@sveltejs/kit';
import { ulid } from 'ulid';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const db = getSqlite();
	const recipe = db
		.prepare(
			`SELECT r.*, c.name AS course_name FROM recipes r
			 LEFT JOIN courses c ON c.id = r.course_id WHERE r.id = ?`
		)
		.get(params.id) as Record<string, unknown> | undefined;
	if (!recipe) error(404, 'Recipe not found');

	return {
		recipe,
		ingredients: db
			.prepare(
				'SELECT raw_text, qty, unit, item, is_heading FROM ingredients WHERE recipe_id = ? ORDER BY position'
			)
			.all(params.id) as {
			raw_text: string;
			qty: number | null;
			unit: string | null;
			item: string | null;
			is_heading: number;
		}[],
		steps: db
			.prepare('SELECT body, is_heading FROM steps WHERE recipe_id = ? ORDER BY position')
			.all(params.id) as { body: string; is_heading: number }[],
		photos: db
			.prepare('SELECT id FROM photos WHERE recipe_id = ? ORDER BY position')
			.all(params.id) as { id: string }[],
		tags: db
			.prepare(
				`SELECT t.name FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
				 WHERE rt.recipe_id = ? ORDER BY t.name`
			)
			.all(params.id) as { name: string }[],
		cookLog: db
			.prepare('SELECT id, cooked_on, note FROM cook_log WHERE recipe_id = ? ORDER BY cooked_on DESC LIMIT 30')
			.all(params.id) as { id: string; cooked_on: string; note: string | null }[]
	};
};

function requireRecipe(id: string) {
	const db = getSqlite();
	if (!db.prepare('SELECT 1 FROM recipes WHERE id = ?').get(id)) error(404, 'Recipe not found');
	return db;
}

export const actions: Actions = {
	rate: async ({ params, request }) => {
		const db = requireRecipe(params.id);
		const form = await request.formData();
		let rating = Number(form.get('rating'));
		if (!Number.isInteger(rating) || rating < 0 || rating > 5) rating = 0;
		const current = db.prepare('SELECT rating FROM recipes WHERE id = ?').get(params.id) as {
			rating: number;
		};
		// Tapping the current rating clears it.
		if (current.rating === rating) rating = 0;
		db.prepare(`UPDATE recipes SET rating = ?, updated_at = ? WHERE id = ?`).run(
			rating,
			new Date().toISOString(),
			params.id
		);
	},

	favorite: async ({ params }) => {
		const db = requireRecipe(params.id);
		db.prepare(
			`UPDATE recipes SET is_favorite = 1 - is_favorite, updated_at = ? WHERE id = ?`
		).run(new Date().toISOString(), params.id);
	},

	cooked: async ({ params, request }) => {
		const db = requireRecipe(params.id);
		const form = await request.formData();
		const note = String(form.get('note') ?? '').trim() || null;
		const today = new Date().toISOString().slice(0, 10);
		db.prepare(`INSERT INTO cook_log (id, recipe_id, cooked_on, note) VALUES (?, ?, ?, ?)`).run(
			ulid(),
			params.id,
			today,
			note
		);
	},

	uncook: async ({ params, request }) => {
		const db = requireRecipe(params.id);
		const form = await request.formData();
		db.prepare(`DELETE FROM cook_log WHERE id = ? AND recipe_id = ?`).run(
			String(form.get('entry')),
			params.id
		);
	},

	delete: async ({ params }) => {
		const db = requireRecipe(params.id);
		deleteRecipe(db, params.id);
		deleteRecipePhotos(params.id);
		redirect(303, '/');
	}
};
