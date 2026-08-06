import { getSqlite } from '$lib/server/db';
import {
	createSession,
	loginLockedFor,
	recordLoginFailure,
	recordLoginSuccess,
	SESSION_COOKIE,
	sessionCookieOptions,
	verifyPassword
} from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const ip = getClientAddress();
		const lockedMs = loginLockedFor(ip);
		if (lockedMs > 0) {
			return fail(429, {
				error: `Too many attempts. Try again in ${Math.ceil(lockedMs / 60000)} min.`
			});
		}

		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const db = getSqlite();

		if (!(await verifyPassword(db, password))) {
			recordLoginFailure(ip);
			return fail(400, { error: 'Wrong password.' });
		}

		recordLoginSuccess(ip);
		cookies.set(SESSION_COOKIE, createSession(db), sessionCookieOptions);
		redirect(303, '/');
	}
};
