import { getSqlite } from '$lib/server/db';
import { isSetUp, SESSION_COOKIE, validateSession } from '$lib/server/auth';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	if (path === '/healthz') return resolve(event);

	const db = getSqlite();
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.authed = !!token && validateSession(db, token);

	if (!isSetUp(db)) {
		if (path !== '/setup') redirect(303, '/setup');
	} else if (!event.locals.authed) {
		if (path !== '/login') redirect(303, '/login');
	} else if (path === '/login' || path === '/setup') {
		redirect(303, '/');
	}

	return resolve(event);
};
