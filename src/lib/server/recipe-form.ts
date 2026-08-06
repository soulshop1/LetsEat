import type { Database } from 'better-sqlite3';
import type { RecipeInput } from './recipes';
import { addPhoto, addPhotoFromUrl, deletePhoto } from './photos';

function optionalNumber(value: FormDataEntryValue | null): number | null {
	const s = String(value ?? '').trim();
	if (!s) return null;
	const n = Number(s);
	return Number.isFinite(n) && n >= 0 ? n : null;
}

export function recipeInputFromForm(form: FormData): { input?: RecipeInput; error?: string } {
	const title = String(form.get('title') ?? '').trim();
	if (!title) return { error: 'Title is required.' };
	return {
		input: {
			title,
			description: String(form.get('description') ?? '').trim(),
			courseId: String(form.get('course_id') ?? '') || null,
			servings: optionalNumber(form.get('servings')),
			servingsUnit: String(form.get('servings_unit') ?? '').trim() || 'servings',
			prepMin: optionalNumber(form.get('prep_min')),
			cookMin: optionalNumber(form.get('cook_min')),
			notes: String(form.get('notes') ?? '').trim(),
			sourceName: String(form.get('source_name') ?? '').trim(),
			sourceUrl: String(form.get('source_url') ?? '').trim(),
			ingredientsText: String(form.get('ingredients') ?? ''),
			stepsText: String(form.get('steps') ?? ''),
			tagsText: String(form.get('tags') ?? '')
		}
	};
}

/** Applies photo removals (`remove_photo` values) and new uploads (`photos` files). */
export async function applyPhotoChanges(
	db: Database,
	recipeId: string,
	form: FormData
): Promise<void> {
	for (const id of form.getAll('remove_photo')) {
		deletePhoto(db, String(id));
	}
	for (const entry of form.getAll('photos')) {
		if (entry instanceof File && entry.size > 0 && entry.type.startsWith('image/')) {
			await addPhoto(db, recipeId, await entry.arrayBuffer());
		}
	}
	const importUrl = String(form.get('import_photo_url') ?? '');
	if (importUrl && form.get('import_photo') === '1') {
		await addPhotoFromUrl(db, recipeId, importUrl);
	}
}
