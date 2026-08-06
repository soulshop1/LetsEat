<script lang="ts">
	interface Course {
		id: string;
		name: string;
	}
	interface ExistingPhoto {
		id: string;
	}
	interface Values {
		title?: string;
		description?: string;
		course_id?: string;
		servings?: number | null;
		servings_unit?: string;
		prep_min?: number | null;
		cook_min?: number | null;
		ingredients?: string;
		steps?: string;
		tags?: string;
		notes?: string;
		source_name?: string;
		source_url?: string;
	}

	let {
		courses,
		values = {},
		photos = [],
		error = '',
		submitLabel,
		action = '',
		importPhotoUrl = ''
	}: {
		courses: Course[];
		values?: Values;
		photos?: ExistingPhoto[];
		error?: string;
		submitLabel: string;
		action?: string;
		importPhotoUrl?: string;
	} = $props();

	const inputClass =
		'rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900';
</script>

<form
	method="POST"
	action={action || undefined}
	enctype="multipart/form-data"
	class="flex max-w-2xl flex-col gap-4"
>
	{#if importPhotoUrl}
		<div class="flex items-center gap-3 rounded-md bg-stone-100 p-2 dark:bg-stone-900">
			<img src={importPhotoUrl} alt="" class="h-16 w-16 rounded object-cover" />
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" name="import_photo" value="1" checked />
				Import this photo from the website
			</label>
			<input type="hidden" name="import_photo_url" value={importPhotoUrl} />
		</div>
	{/if}
	<label class="flex flex-col gap-1 text-sm font-medium">
		Title
		<input name="title" required value={values.title ?? ''} class={inputClass} />
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium">
		Description
		<textarea name="description" rows="2" class={inputClass}>{values.description ?? ''}</textarea>
	</label>

	<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
		<label class="flex flex-col gap-1 text-sm font-medium">
			Course
			<select name="course_id" class={inputClass}>
				<option value="">—</option>
				{#each courses as c (c.id)}
					<option value={c.id} selected={values.course_id === c.id}>{c.name}</option>
				{/each}
			</select>
		</label>
		<label class="flex flex-col gap-1 text-sm font-medium">
			Servings
			<input name="servings" type="number" min="0" step="any" value={values.servings ?? ''} class={inputClass} />
		</label>
		<label class="flex flex-col gap-1 text-sm font-medium">
			Prep (min)
			<input name="prep_min" type="number" min="0" value={values.prep_min ?? ''} class={inputClass} />
		</label>
		<label class="flex flex-col gap-1 text-sm font-medium">
			Cook (min)
			<input name="cook_min" type="number" min="0" value={values.cook_min ?? ''} class={inputClass} />
		</label>
	</div>

	<label class="flex flex-col gap-1 text-sm font-medium">
		Ingredients
		<span class="text-xs font-normal text-stone-500">
			One per line. Start a line with # for a section heading, e.g. “# For the sauce”.
		</span>
		<textarea name="ingredients" rows="10" class="{inputClass} font-mono text-[13px]"
			>{values.ingredients ?? ''}</textarea
		>
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium">
		Steps
		<span class="text-xs font-normal text-stone-500">
			One step per line. # headings work here too.
		</span>
		<textarea name="steps" rows="10" class={inputClass}>{values.steps ?? ''}</textarea>
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium">
		Tags
		<span class="text-xs font-normal text-stone-500">Comma-separated, e.g. “thai, soup, weeknight”.</span>
		<input name="tags" value={values.tags ?? ''} class={inputClass} />
	</label>

	{#if photos.length > 0}
		<fieldset class="flex flex-col gap-2 text-sm font-medium">
			Photos
			<div class="flex flex-wrap gap-3">
				{#each photos as p (p.id)}
					<label class="flex cursor-pointer flex-col items-center gap-1 text-xs font-normal">
						<img src="/photo/{p.id}/thumb" alt="" class="h-20 w-20 rounded-md object-cover" />
						<span><input type="checkbox" name="remove_photo" value={p.id} /> remove</span>
					</label>
				{/each}
			</div>
		</fieldset>
	{/if}

	<label class="flex flex-col gap-1 text-sm font-medium">
		{photos.length > 0 ? 'Add photos' : 'Photos'}
		<input name="photos" type="file" accept="image/*" multiple class="text-sm" />
	</label>

	<label class="flex flex-col gap-1 text-sm font-medium">
		Notes
		<textarea name="notes" rows="3" class={inputClass}>{values.notes ?? ''}</textarea>
	</label>

	<div class="grid grid-cols-2 gap-3">
		<label class="flex flex-col gap-1 text-sm font-medium">
			Source name
			<input name="source_name" value={values.source_name ?? ''} class={inputClass} />
		</label>
		<label class="flex flex-col gap-1 text-sm font-medium">
			Source URL
			<input name="source_url" type="url" value={values.source_url ?? ''} class={inputClass} />
		</label>
	</div>

	{#if error}
		<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
	{/if}

	<div class="flex gap-2">
		<button class="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">
			{submitLabel}
		</button>
		<a
			href="/"
			class="rounded-md px-4 py-2 text-sm text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
		>
			Cancel
		</a>
	</div>
</form>
