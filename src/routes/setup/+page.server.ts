import { getSqlite } from '$lib/server/db';
import { createSession, SESSION_COOKIE, sessionCookieOptions, setPassword } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters.' });
		}
		if (password !== confirm) {
			return fail(400, { error: 'Passwords do not match.' });
		}

		const db = getSqlite();
		await setPassword(db, password);
		cookies.set(SESSION_COOKIE, createSession(db), sessionCookieOptions);
		redirect(303, '/');
	}
};
