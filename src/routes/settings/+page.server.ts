import { getSqlite } from '$lib/server/db';
import { setPassword, verifyPassword } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const db = getSqlite();
	const counts = db
		.prepare('SELECT (SELECT COUNT(*) FROM recipes) AS recipes, (SELECT COUNT(*) FROM photos) AS photos')
		.get() as { recipes: number; photos: number };
	return { counts };
};

export const actions: Actions = {
	password: async ({ request }) => {
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		const db = getSqlite();

		if (!(await verifyPassword(db, current))) {
			return fail(400, { error: 'Current password is wrong.' });
		}
		if (next.length < 8) {
			return fail(400, { error: 'New password must be at least 8 characters.' });
		}
		if (next !== confirm) {
			return fail(400, { error: 'New passwords do not match.' });
		}
		await setPassword(db, next);
		return { success: 'Password changed.' };
	}
};
