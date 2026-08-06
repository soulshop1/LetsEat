<script lang="ts">
	import RecipeForm from '$lib/components/RecipeForm.svelte';

	let { data, form } = $props();

	let importing = $state(false);
</script>

<svelte:head>
	<title>Import — Let's Eat!</title>
</svelte:head>

{#if form?.extracted}
	<h1 class="mb-1 text-lg font-semibold">Review the imported recipe</h1>
	<p class="mb-4 text-sm text-stone-500">
		Check the fields below — imports are never saved without your review.
	</p>
	<RecipeForm
		courses={data.courses}
		action="/recipes/new"
		submitLabel="Save recipe"
		importPhotoUrl={form.extracted.imageUrl}
		values={{
			title: form.extracted.title,
			description: form.extracted.description,
			course_id: form.courseId,
			servings: form.extracted.servings,
			prep_min: form.extracted.prepMin,
			cook_min: form.extracted.cookMin,
			ingredients: form.extracted.ingredientsText,
			steps: form.extracted.stepsText,
			tags: form.extracted.tagsText,
			source_name: form.extracted.sourceName,
			source_url: form.extracted.sourceUrl
		}}
	/>
{:else}
	<h1 class="mb-4 text-lg font-semibold">Import a recipe</h1>

	<section class="max-w-xl">
		<h2 class="mb-1 text-sm font-semibold">From a website</h2>
		<p class="mb-2 text-xs text-stone-500">
			Paste a recipe page URL. Works with most recipe sites.
		</p>
		<form
			method="POST"
			action="?/url"
			class="flex gap-2"
			onsubmit={() => (importing = true)}
		>
			<input
				type="url"
				name="url"
				required
				placeholder="https://…"
				class="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
			/>
			<button
				disabled={importing}
				class="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
			>
				{importing ? 'Fetching…' : 'Import'}
			</button>
		</form>
		{#if form?.error}
			<p class="mt-2 text-sm text-red-600 dark:text-red-400">{form.error}</p>
			{#if form?.fallback}
				<a
					href="/recipes/new"
					class="mt-1 inline-block text-sm text-orange-600 hover:underline dark:text-orange-400"
				>
					Add “{form.fallback.title || 'this recipe'}” manually →
				</a>
			{/if}
		{/if}
	</section>

	<section class="mt-8 max-w-xl">
		<h2 class="mb-1 text-sm font-semibold">From Recipe Keeper</h2>
		<p class="text-xs text-stone-500">
			Planned: one-time migration from a Recipe Keeper export file. Until then, individual
			recipes can be brought over via their source URLs or manual entry.
		</p>
	</section>
{/if}
