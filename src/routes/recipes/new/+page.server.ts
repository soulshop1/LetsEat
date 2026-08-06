import { getSqlite } from '$lib/server/db';
import { applyPhotoChanges, recipeInputFromForm } from '$lib/server/recipe-form';
import { createRecipe } from '$lib/server/recipes';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const courses = getSqlite()
		.prepare('SELECT id, name FROM courses ORDER BY position')
		.all() as { id: string; name: string }[];
	return { courses };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const { input, error } = recipeInputFromForm(form);
		if (!input) return fail(400, { error });
		const db = getSqlite();
		const id = createRecipe(db, input);
		await applyPhotoChanges(db, id, form);
		redirect(303, `/recipes/${id}`);
	}
};
