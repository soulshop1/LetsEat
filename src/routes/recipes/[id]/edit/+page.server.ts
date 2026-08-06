import { getSqlite } from '$lib/server/db';
import { applyPhotoChanges, recipeInputFromForm } from '$lib/server/recipe-form';
import { updateRecipe } from '$lib/server/recipes';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const db = getSqlite();
	const recipe = db
		.prepare(
			`SELECT id, title, description, course_id, servings, servings_unit, prep_min, cook_min,
			   notes, source_name, source_url FROM recipes WHERE id = ?`
		)
		.get(params.id) as Record<string, unknown> | undefined;
	if (!recipe) error(404, 'Recipe not found');

	const ingredients = db
		.prepare('SELECT raw_text, is_heading FROM ingredients WHERE recipe_id = ? ORDER BY position')
		.all(params.id) as { raw_text: string; is_heading: number }[];
	const steps = db
		.prepare('SELECT body, is_heading FROM steps WHERE recipe_id = ? ORDER BY position')
		.all(params.id) as { body: string; is_heading: number }[];
	const tags = db
		.prepare(
			`SELECT t.name FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id
			 WHERE rt.recipe_id = ? ORDER BY t.name`
		)
		.all(params.id) as { name: string }[];
	const photos = db
		.prepare('SELECT id FROM photos WHERE recipe_id = ? ORDER BY position')
		.all(params.id) as { id: string }[];
	const courses = db
		.prepare('SELECT id, name FROM courses ORDER BY position')
		.all() as { id: string; name: string }[];

	return {
		recipe,
		courses,
		photos,
		ingredientsText: ingredients
			.map((i) => (i.is_heading ? `# ${i.raw_text}` : i.raw_text))
			.join('\n'),
		stepsText: steps.map((s) => (s.is_heading ? `# ${s.body}` : s.body)).join('\n'),
		tagsText: tags.map((t) => t.name).join(', ')
	};
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const db = getSqlite();
		const exists = db.prepare('SELECT 1 FROM recipes WHERE id = ?').get(params.id);
		if (!exists) error(404, 'Recipe not found');
		const form = await request.formData();
		const { input, error: formError } = recipeInputFromForm(form);
		if (!input) return fail(400, { error: formError });
		updateRecipe(db, params.id, input);
		await applyPhotoChanges(db, params.id, form);
		redirect(303, `/recipes/${params.id}`);
	}
};
