import { getSqlite } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const row = getSqlite().prepare('SELECT COUNT(*) AS n FROM recipes').get() as { n: number };
	return { recipeCount: row.n };
};
