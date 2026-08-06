import type { Database } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ulid } from 'ulid';
import { photosDir } from './db';

const COVER_MAX = 1600;
const THUMB_SIZE = 480;

export function photoFilePath(recipeId: string, filename: string, size: 'cover' | 'thumb'): string {
	return path.join(photosDir(), recipeId, `${filename}-${size}.webp`);
}

/**
 * Re-encodes an upload to webp (strips EXIF/GPS, neutralizes malformed files),
 * writes cover + thumb files, and records the photo row.
 */
export async function addPhoto(db: Database, recipeId: string, data: ArrayBuffer): Promise<void> {
	const img = sharp(Buffer.from(data)).rotate();
	const cover = await img
		.clone()
		.resize({ width: COVER_MAX, height: COVER_MAX, fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 82 })
		.toBuffer({ resolveWithObject: true });
	const thumb = await img
		.clone()
		.resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: 'cover' })
		.webp({ quality: 78 })
		.toBuffer();

	const filename = ulid();
	const dir = path.join(photosDir(), recipeId);
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(photoFilePath(recipeId, filename, 'cover'), cover.data);
	fs.writeFileSync(photoFilePath(recipeId, filename, 'thumb'), thumb);

	const max = db
		.prepare('SELECT COALESCE(MAX(position), 0) AS p FROM photos WHERE recipe_id = ?')
		.get(recipeId) as { p: number };
	db.prepare(
		`INSERT INTO photos (id, recipe_id, position, filename, width, height, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(
		ulid(),
		recipeId,
		max.p + 1,
		filename,
		cover.info.width,
		cover.info.height,
		new Date().toISOString()
	);
}

export function deletePhoto(db: Database, photoId: string): void {
	const row = db.prepare('SELECT recipe_id, filename FROM photos WHERE id = ?').get(photoId) as
		| { recipe_id: string; filename: string }
		| undefined;
	if (!row) return;
	db.prepare('DELETE FROM photos WHERE id = ?').run(photoId);
	for (const size of ['cover', 'thumb'] as const) {
		fs.rmSync(photoFilePath(row.recipe_id, row.filename, size), { force: true });
	}
}

/** Removes a recipe's whole photo directory. Call after deleting the recipe row. */
export function deleteRecipePhotos(recipeId: string): void {
	fs.rmSync(path.join(photosDir(), recipeId), { recursive: true, force: true });
}
