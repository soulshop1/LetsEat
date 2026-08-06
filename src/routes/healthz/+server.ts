import { getSqlite } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	getSqlite().prepare('SELECT 1').get();
	return json({ ok: true });
};
