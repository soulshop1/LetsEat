import { getSqlite } from '$lib/server/db';
import { destroySession, SESSION_COOKIE, sessionCookieOptions } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) destroySession(getSqlite(), token);
	cookies.delete(SESSION_COOKIE, { path: sessionCookieOptions.path });
	redirect(303, '/login');
};
