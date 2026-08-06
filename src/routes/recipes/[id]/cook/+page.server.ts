import { getSqlite } from '$lib/server/db';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const db = getSqlite();
	const recipe = db
		.prepare('SELECT id, title FROM recipes WHERE id = ?')
		.get(params.id) as { id: string; title: string } | undefined;
	if (!recipe) error(404, 'Recipe not found');

	const steps = db
		.prepare('SELECT body, is_heading FROM steps WHERE recipe_id = ? ORDER BY position')
		.all(params.id) as { body: string; is_heading: number }[];
	const ingredients = db
		.prepare('SELECT raw_text, is_heading FROM ingredients WHERE recipe_id = ? ORDER BY position')
		.all(params.id) as { raw_text: string; is_heading: number }[];

	// Fold headings into the following step as a section label.
	const slides: { section: string; body: string }[] = [];
	let section = '';
	for (const s of steps) {
		if (s.is_heading) {
			section = s.body;
		} else {
			slides.push({ section, body: s.body });
		}
	}

	return { recipe, slides, ingredients };
};
