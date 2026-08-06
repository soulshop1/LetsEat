import { getSqlite } from '$lib/server/db';
import { extractRecipe, fetchPage, guardImportUrl, pageTitle } from '$lib/server/url-import';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const courses = getSqlite()
		.prepare('SELECT id, name FROM courses ORDER BY position')
		.all() as { id: string; name: string }[];
	return { courses };
};

export const actions: Actions = {
	url: async ({ request }) => {
		const form = await request.formData();
		const raw = String(form.get('url') ?? '').trim();
		const { url, error } = guardImportUrl(raw);
		if (!url) return fail(400, { error, fallback: null });

		let finalUrl: string;
		let html: string;
		try {
			({ finalUrl, html } = await fetchPage(url));
		} catch (e) {
			return fail(502, {
				error: `Couldn't fetch that page: ${e instanceof Error ? e.message : 'unknown error'}`,
				fallback: null
			});
		}

		const extracted = extractRecipe(html, finalUrl);
		if (!extracted) {
			return fail(422, {
				error: 'No recipe markup found on that page. You can still add it by hand.',
				fallback: { title: pageTitle(html), sourceUrl: finalUrl }
			});
		}

		// Map the page's category to one of our courses when the names line up.
		const course = extracted.courseName
			? (getSqlite()
					.prepare('SELECT id FROM courses WHERE name = ? COLLATE NOCASE')
					.get(extracted.courseName) as { id: string } | undefined)
			: undefined;

		return { extracted, courseId: course?.id ?? '' };
	}
};
