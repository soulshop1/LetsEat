import { getSqlite } from '$lib/server/db';
import { ftsQuery } from '$lib/server/recipes';
import type { PageServerLoad } from './$types';

export interface RecipeCard {
	id: string;
	title: string;
	rating: number;
	is_favorite: number;
	total_min: number | null;
	photo_id: string | null;
}

const SORTS: Record<string, string> = {
	new: 'r.created_at DESC',
	updated: 'r.updated_at DESC',
	title: 'r.title COLLATE NOCASE ASC',
	rating: 'r.rating DESC, r.updated_at DESC'
};

export const load: PageServerLoad = ({ url }) => {
	const db = getSqlite();
	const q = url.searchParams.get('q')?.trim() ?? '';
	const course = url.searchParams.get('course') ?? '';
	const tag = url.searchParams.get('tag') ?? '';
	const fav = url.searchParams.get('fav') === '1';
	const maxtime = Number(url.searchParams.get('maxtime')) || 0;
	const sort = SORTS[url.searchParams.get('sort') ?? ''] ? (url.searchParams.get('sort') as string) : 'new';

	const where: string[] = [];
	const args: unknown[] = [];

	const match = q ? ftsQuery(q) : '';
	if (match) {
		where.push('r.id IN (SELECT recipe_id FROM recipes_fts WHERE recipes_fts MATCH ?)');
		args.push(match);
	}
	if (course) {
		where.push('r.course_id = ?');
		args.push(course);
	}
	if (tag) {
		where.push(
			'r.id IN (SELECT rt.recipe_id FROM recipe_tags rt JOIN tags t ON t.id = rt.tag_id WHERE t.name = ?)'
		);
		args.push(tag);
	}
	if (fav) where.push('r.is_favorite = 1');
	if (maxtime > 0) {
		where.push('r.total_min IS NOT NULL AND r.total_min <= ?');
		args.push(maxtime);
	}

	const recipes = db
		.prepare(
			`SELECT r.id, r.title, r.rating, r.is_favorite, r.total_min,
			   (SELECT p.id FROM photos p WHERE p.recipe_id = r.id ORDER BY p.position LIMIT 1) AS photo_id
			 FROM recipes r
			 ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
			 ORDER BY ${SORTS[sort]}
			 LIMIT 500`
		)
		.all(...args) as RecipeCard[];

	const courses = db
		.prepare(
			`SELECT c.id, c.name, COUNT(r.id) AS count
			 FROM courses c LEFT JOIN recipes r ON r.course_id = c.id
			 GROUP BY c.id ORDER BY c.position`
		)
		.all() as { id: string; name: string; count: number }[];

	const tags = db
		.prepare(
			`SELECT t.name, COUNT(rt.recipe_id) AS count
			 FROM tags t JOIN recipe_tags rt ON rt.tag_id = t.id
			 GROUP BY t.id ORDER BY count DESC, t.name LIMIT 40`
		)
		.all() as { name: string; count: number }[];

	const totals = db
		.prepare(
			`SELECT COUNT(*) AS all_count, SUM(is_favorite) AS fav_count FROM recipes`
		)
		.get() as { all_count: number; fav_count: number | null };

	return {
		recipes,
		courses,
		tags,
		allCount: totals.all_count,
		favCount: totals.fav_count ?? 0,
		filters: { q, course, tag, fav, maxtime, sort }
	};
};
