<script lang="ts">
	import { enhance } from '$app/forms';
	import { scaleLine, type ParsedIngredient } from '$lib/ingredient-parse';

	let { data } = $props();

	const baseServings = $derived((data.recipe.servings as number | null) ?? null);
	let servings = $state<number | null>(null);
	let multiplier = $state(1);

	$effect(() => {
		// Reset scaling when navigating between recipes.
		void data.recipe.id;
		servings = null;
		multiplier = 1;
	});

	const factor = $derived(
		baseServings ? (servings ?? baseServings) / baseServings : multiplier
	);

	const scaledIngredients = $derived(
		data.ingredients.map((i) => {
			const p: ParsedIngredient = {
				raw: i.raw_text,
				qty: i.qty,
				unit: i.unit,
				item: i.item,
				isHeading: i.is_heading === 1
			};
			return { ...scaleLine(p, factor), isHeading: p.isHeading };
		})
	);

	const numberedSteps = $derived.by(() => {
		let n = 0;
		return data.steps.map((s) => ({ ...s, n: s.is_heading ? 0 : ++n }));
	});
</script>

<svelte:head>
	<title>{data.recipe.title} — Let's Eat!</title>
</svelte:head>

<article>
	<div class="mb-4 flex flex-wrap items-start justify-between gap-3 print:hidden">
		<a href="/" class="text-sm text-stone-500 hover:text-orange-600">← Library</a>
		<div class="flex gap-2">
			<a
				href="/recipes/{data.recipe.id}/cook"
				class="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
			>
				Cook
			</a>
			<a
				href="/recipes/{data.recipe.id}/edit"
				class="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
			>
				Edit
			</a>
			<button
				onclick={() => window.print()}
				class="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
			>
				Print
			</button>
			<form
				method="POST"
				action="?/delete"
				onsubmit={(e) => {
					if (!confirm('Delete this recipe and its photos? This cannot be undone.')) {
						e.preventDefault();
					}
				}}
			>
				<button
					class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
				>
					Delete
				</button>
			</form>
		</div>
	</div>

	{#if data.photos.length > 0}
		<div class="mb-4 flex gap-2 overflow-x-auto print:hidden">
			{#each data.photos as p, i (p.id)}
				<img
					src="/photo/{p.id}/cover"
					alt=""
					class={i === 0
						? 'h-56 min-w-0 flex-1 rounded-lg object-cover sm:h-72'
						: 'h-56 w-32 shrink-0 rounded-lg object-cover sm:h-72'}
				/>
			{/each}
		</div>
	{/if}

	<header class="mb-4">
		<div class="flex items-start justify-between gap-3">
			<h1 class="text-2xl font-bold">{data.recipe.title}</h1>
			<form method="POST" action="?/favorite" use:enhance class="print:hidden">
				<button
					aria-label="Toggle favorite"
					class="text-2xl {data.recipe.is_favorite ? 'text-red-500' : 'text-stone-300 hover:text-red-400 dark:text-stone-600'}"
				>
					♥
				</button>
			</form>
		</div>
		{#if data.recipe.description}
			<p class="mt-1 text-stone-600 dark:text-stone-300">{data.recipe.description}</p>
		{/if}

		<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-500">
			<form method="POST" action="?/rate" use:enhance class="flex print:hidden">
				{#each [1, 2, 3, 4, 5] as n (n)}
					<button
						name="rating"
						value={n}
						aria-label="Rate {n} stars"
						class="text-lg {n <= (data.recipe.rating as number) ? 'text-amber-500' : 'text-stone-300 hover:text-amber-400 dark:text-stone-600'}"
					>
						★
					</button>
				{/each}
			</form>
			{#if data.recipe.course_name}<span>{data.recipe.course_name}</span>{/if}
			{#if data.recipe.prep_min}<span>Prep {data.recipe.prep_min} min</span>{/if}
			{#if data.recipe.cook_min}<span>Cook {data.recipe.cook_min} min</span>{/if}
			{#if data.recipe.total_min}<span class="font-medium">Total {data.recipe.total_min} min</span>{/if}
		</div>

		{#if data.tags.length > 0}
			<div class="mt-2 flex flex-wrap gap-1.5">
				{#each data.tags as t (t.name)}
					<a
						href="/?tag={encodeURIComponent(t.name)}"
						class="rounded-full border border-stone-300 px-2 py-0.5 text-xs text-stone-600 hover:border-orange-400 dark:border-stone-700 dark:text-stone-300"
					>
						{t.name}
					</a>
				{/each}
			</div>
		{/if}
	</header>

	<div class="grid gap-8 md:grid-cols-[minmax(16rem,1fr)_2fr]">
		<section>
			<div class="mb-2 flex items-center justify-between gap-2">
				<h2 class="font-semibold">Ingredients</h2>
				<div class="flex items-center gap-1 text-sm print:hidden">
					{#if baseServings}
						<button
							onclick={() => (servings = Math.max(1, (servings ?? baseServings) - 1))}
							class="h-7 w-7 rounded-md border border-stone-300 dark:border-stone-700"
							aria-label="Fewer servings"
						>
							−
						</button>
						<span class="min-w-16 text-center">
							{servings ?? baseServings}
							{data.recipe.servings_unit}
						</span>
						<button
							onclick={() => (servings = (servings ?? baseServings) + 1)}
							class="h-7 w-7 rounded-md border border-stone-300 dark:border-stone-700"
							aria-label="More servings"
						>
							+
						</button>
					{:else}
						{#each [[0.5, '½×'], [1, '1×'], [2, '2×'], [3, '3×']] as [f, label] (f)}
							<button
								onclick={() => (multiplier = f as number)}
								class="rounded-md border px-2 py-0.5 {multiplier === f ? 'border-orange-500 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' : 'border-stone-300 dark:border-stone-700'}"
							>
								{label}
							</button>
						{/each}
					{/if}
				</div>
			</div>
			{#if factor !== 1}
				<p class="mb-2 text-xs text-orange-600 dark:text-orange-400 print:hidden">
					Scaled ×{Math.round(factor * 100) / 100}. Unmarked lines couldn't be scaled.
				</p>
			{/if}
			<ul class="flex flex-col gap-1.5 text-[15px]">
				{#each scaledIngredients as line, i (i)}
					{#if line.isHeading}
						<li class="mt-2 text-sm font-semibold text-stone-500 uppercase">{line.text}</li>
					{:else}
						<li class="flex items-baseline gap-2">
							<span>{line.text}</span>
							{#if factor !== 1 && !line.scaled}
								<span class="text-xs text-stone-400" title="Not scalable">•</span>
							{/if}
						</li>
					{/if}
				{/each}
			</ul>
		</section>

		<section>
			<h2 class="mb-2 font-semibold">Steps</h2>
			<ol class="flex flex-col gap-3">
				{#each numberedSteps as s, i (i)}
					{#if s.is_heading}
						<li class="mt-2 list-none text-sm font-semibold text-stone-500 uppercase">{s.body}</li>
					{:else}
						<li class="flex gap-3">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-300"
							>
								{s.n}
							</span>
							<p class="text-[15px] leading-relaxed">{s.body}</p>
						</li>
					{/if}
				{/each}
			</ol>
		</section>
	</div>

	{#if data.recipe.notes}
		<section class="mt-8 rounded-lg bg-amber-50 p-4 dark:bg-stone-900">
			<h2 class="mb-1 text-sm font-semibold">Notes</h2>
			<p class="text-sm whitespace-pre-line text-stone-700 dark:text-stone-300">{data.recipe.notes}</p>
		</section>
	{/if}

	{#if data.recipe.source_name || data.recipe.source_url}
		<p class="mt-4 text-xs text-stone-400">
			Source:
			{#if data.recipe.source_url}
				<a href={data.recipe.source_url as string} rel="noopener noreferrer" class="underline">
					{data.recipe.source_name || data.recipe.source_url}
				</a>
			{:else}
				{data.recipe.source_name}
			{/if}
		</p>
	{/if}

	<section class="mt-8 print:hidden">
		<div class="flex items-center gap-3">
			<form method="POST" action="?/cooked" use:enhance class="flex gap-2">
				<input
					name="note"
					placeholder="Note (optional)"
					class="w-40 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-900"
				/>
				<button
					class="rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-200 dark:text-stone-900"
				>
					I cooked this today
				</button>
			</form>
		</div>
		{#if data.cookLog.length > 0}
			<ul class="mt-3 flex flex-col gap-1 text-sm text-stone-500">
				{#each data.cookLog as entry (entry.id)}
					<li class="flex items-center gap-2">
						<span>🍲 {entry.cooked_on}</span>
						{#if entry.note}<span class="text-stone-400">— {entry.note}</span>{/if}
						<form method="POST" action="?/uncook" use:enhance>
							<button name="entry" value={entry.id} aria-label="Remove entry" class="text-xs text-stone-300 hover:text-red-500">
								✕
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</article>
