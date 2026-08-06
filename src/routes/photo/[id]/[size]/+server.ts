import { getSqlite } from '$lib/server/db';
import { photoFilePath } from '$lib/server/photos';
import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	if (params.size !== 'cover' && params.size !== 'thumb') error(404);
	const row = getSqlite()
		.prepare('SELECT recipe_id, filename FROM photos WHERE id = ?')
		.get(params.id) as { recipe_id: string; filename: string } | undefined;
	if (!row) error(404);
	const file = photoFilePath(row.recipe_id, row.filename, params.size);
	if (!fs.existsSync(file)) error(404);
	return new Response(fs.readFileSync(file), {
		headers: {
			'content-type': 'image/webp',
			// Photo files are immutable (a new upload gets a new id).
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
};
