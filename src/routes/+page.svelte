<script lang="ts">
	let { data } = $props();

	function filterUrl(overrides: Record<string, string>): string {
		const f = data.filters;
		const params = new URLSearchParams();
		const merged = {
			q: f.q,
			course: f.course,
			tag: f.tag,
			fav: f.fav ? '1' : '',
			maxtime: f.maxtime ? String(f.maxtime) : '',
			sort: f.sort === 'new' ? '' : f.sort,
			...overrides
		};
		for (const [k, v] of Object.entries(merged)) {
			if (v) params.set(k, v);
		}
		const s = params.toString();
		return s ? `/?${s}` : '/';
	}

	const hasFilters = $derived(
		!!(data.filters.q || data.filters.course || data.filters.tag || data.filters.fav || data.filters.maxtime)
	);
</script>

<svelte:head>
	<title>Let's Eat!</title>
</svelte:head>

<div class="flex flex-col gap-6 md:flex-row">
	<aside class="md:w-52 md:shrink-0">
		<details class="md:open:block" open>
			<summary class="mb-2 cursor-pointer text-sm font-semibold text-stone-500 md:hidden">
				Browse
			</summary>
			<nav class="flex flex-wrap gap-x-4 gap-y-1 text-sm md:flex-col md:gap-y-2">
				<a
					href={filterUrl({ course: '', tag: '', fav: '' })}
					class="flex items-center justify-between gap-2 rounded px-1 py-0.5 {!data.filters.course && !data.filters.tag && !data.filters.fav ? 'font-semibold text-orange-600 dark:text-orange-400' : 'hover:text-orange-600'}"
				>
					All recipes <span class="text-xs text-stone-400">{data.allCount}</span>
				</a>
				<a
					href={filterUrl({ fav: '1', course: '', tag: '' })}
					class="flex items-center justify-between gap-2 rounded px-1 py-0.5 {data.filters.fav ? 'font-semibold text-orange-600 dark:text-orange-400' : 'hover:text-orange-600'}"
				>
					♥ Favorites <span class="text-xs text-stone-400">{data.favCount}</span>
				</a>
				<div class="mt-2 hidden text-xs font-semibold tracking-wide text-stone-400 uppercase md:block">
					Courses
				</div>
				{#each data.courses as c (c.id)}
					{#if c.count > 0}
						<a
							href={filterUrl({ course: data.filters.course === c.id ? '' : c.id })}
							class="flex items-center justify-between gap-2 rounded px-1 py-0.5 {data.filters.course === c.id ? 'font-semibold text-orange-600 dark:text-orange-400' : 'hover:text-orange-600'}"
						>
							{c.name} <span class="text-xs text-stone-400">{c.count}</span>
						</a>
					{/if}
				{/each}
				{#if data.tags.length > 0}
					<div class="mt-2 hidden text-xs font-semibold tracking-wide text-stone-400 uppercase md:block">
						Tags
					</div>
					<div class="flex flex-wrap gap-1.5 md:pr-2">
						{#each data.tags as t (t.name)}
							<a
								href={filterUrl({ tag: data.filters.tag === t.name ? '' : t.name })}
								class="rounded-full border px-2 py-0.5 text-xs {data.filters.tag === t.name ? 'border-orange-500 bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' : 'border-stone-300 text-stone-600 hover:border-orange-400 dark:border-stone-700 dark:text-stone-300'}"
							>
								{t.name}
							</a>
						{/each}
					</div>
				{/if}
			</nav>
		</details>
	</aside>

	<section class="min-w-0 flex-1">
		<form method="GET" class="mb-4 flex gap-2">
			{#if data.filters.course}<input type="hidden" name="course" value={data.filters.course} />{/if}
			{#if data.filters.tag}<input type="hidden" name="tag" value={data.filters.tag} />{/if}
			{#if data.filters.fav}<input type="hidden" name="fav" value="1" />{/if}
			<input
				type="search"
				name="q"
				value={data.filters.q}
				placeholder="Search recipes…"
				class="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
			/>
			<select
				name="sort"
				value={data.filters.sort}
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
				class="rounded-md border border-stone-300 bg-white px-2 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
			>
				<option value="new">Newest</option>
				<option value="updated">Updated</option>
				<option value="title">A–Z</option>
				<option value="rating">Top rated</option>
			</select>
			<button class="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700">
				Search
			</button>
		</form>

		{#if data.recipes.length === 0}
			<div class="flex flex-col items-center gap-3 py-24 text-center">
				<p class="text-4xl">🍳</p>
				{#if hasFilters}
					<h2 class="font-semibold">No recipes match</h2>
					<p class="text-sm text-stone-500">Try clearing the search or filters.</p>
					<a href="/" class="text-sm text-orange-600 hover:underline dark:text-orange-400">Clear all</a>
				{:else}
					<h2 class="font-semibold">Your library is empty</h2>
					<p class="text-sm text-stone-500">Add your first recipe to get cooking.</p>
					<a
						href="/recipes/new"
						class="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
					>
						New recipe
					</a>
				{/if}
			</div>
		{:else}
			<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
				{#each data.recipes as r (r.id)}
					<li>
						<a
							href="/recipes/{r.id}"
							class="block overflow-hidden rounded-lg border border-stone-200 bg-white transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
						>
							{#if r.photo_id}
								<img
									src="/photo/{r.photo_id}/thumb"
									alt=""
									loading="lazy"
									class="aspect-square w-full object-cover"
								/>
							{:else}
								<div class="flex aspect-square w-full items-center justify-center bg-stone-100 text-4xl dark:bg-stone-800">
									🍽️
								</div>
							{/if}
							<div class="p-2.5">
								<h3 class="line-clamp-2 text-sm font-medium">{r.title}</h3>
								<p class="mt-1 flex items-center gap-2 text-xs text-stone-500">
									{#if r.rating > 0}<span class="text-amber-500">{'★'.repeat(r.rating)}</span>{/if}
									{#if r.total_min}<span>{r.total_min} min</span>{/if}
									{#if r.is_favorite}<span class="text-red-500">♥</span>{/if}
								</p>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<a
	href="/recipes/new"
	aria-label="New recipe"
	class="fixed right-5 bottom-5 flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-3xl text-white shadow-lg hover:bg-orange-700 print:hidden"
>
	+
</a>
