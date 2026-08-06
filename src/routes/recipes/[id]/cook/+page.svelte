<script lang="ts">
	let { data } = $props();

	let index = $state(0);
	let showIngredients = $state(false);
	let touchStartX = 0;

	const total = $derived(data.slides.length);
	const slide = $derived(data.slides[index]);

	function next() {
		if (index < total - 1) index += 1;
	}
	function prev() {
		if (index > 0) index -= 1;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === ' ') next();
		else if (e.key === 'ArrowLeft') prev();
		else if (e.key === 'Escape') history.back();
	}

	// Keep the screen awake while cooking; re-acquire when the tab returns.
	$effect(() => {
		let lock: WakeLockSentinel | null = null;
		const acquire = async () => {
			try {
				lock = (await navigator.wakeLock?.request('screen')) ?? null;
			} catch {
				// Wake lock is best-effort (unsupported browsers, power-save mode).
			}
		};
		const onVisible = () => {
			if (document.visibilityState === 'visible') acquire();
		};
		acquire();
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			document.removeEventListener('visibilitychange', onVisible);
			lock?.release().catch(() => {});
		};
	});
</script>

<svelte:head>
	<title>Cooking: {data.recipe.title} — Let's Eat!</title>
</svelte:head>

<svelte:window onkeydown={onKey} />

<div
	role="region"
	aria-label="Cooking steps"
	class="fixed inset-0 z-50 flex flex-col bg-stone-50 dark:bg-stone-950"
	ontouchstart={(e) => (touchStartX = e.touches[0].clientX)}
	ontouchend={(e) => {
		const dx = e.changedTouches[0].clientX - touchStartX;
		if (dx < -60) next();
		else if (dx > 60) prev();
	}}
>
	<header class="flex items-center justify-between gap-3 px-4 py-3">
		<a
			href="/recipes/{data.recipe.id}"
			class="rounded-md px-2 py-1 text-sm text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
		>
			✕ Exit
		</a>
		<h1 class="min-w-0 truncate text-sm font-semibold text-stone-500">{data.recipe.title}</h1>
		<button
			onclick={() => (showIngredients = !showIngredients)}
			class="rounded-md px-2 py-1 text-sm {showIngredients ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800'}"
		>
			Ingredients
		</button>
	</header>

	{#if total === 0}
		<div class="flex flex-1 items-center justify-center p-8 text-center text-stone-500">
			This recipe has no steps yet.
		</div>
	{:else if showIngredients}
		<div class="flex-1 overflow-y-auto px-6 pb-6">
			<ul class="mx-auto flex max-w-md flex-col gap-2 text-lg">
				{#each data.ingredients as i, n (n)}
					{#if i.is_heading}
						<li class="mt-3 text-sm font-semibold text-stone-500 uppercase">{i.raw_text}</li>
					{:else}
						<li>{i.raw_text}</li>
					{/if}
				{/each}
			</ul>
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center px-6 pb-4 text-center">
			{#if slide.section}
				<p class="mb-2 text-sm font-semibold tracking-wide text-orange-600 uppercase dark:text-orange-400">
					{slide.section}
				</p>
			{/if}
			<p class="max-w-xl text-2xl leading-relaxed font-medium sm:text-3xl">{slide.body}</p>
		</div>

		<footer class="flex items-center justify-between gap-4 px-6 pb-8">
			<button
				onclick={prev}
				disabled={index === 0}
				class="h-14 w-24 rounded-xl border border-stone-300 text-lg disabled:opacity-30 dark:border-stone-700"
			>
				←
			</button>
			<span class="text-sm text-stone-500">Step {index + 1} of {total}</span>
			<button
				onclick={next}
				disabled={index === total - 1}
				class="h-14 w-24 rounded-xl bg-orange-600 text-lg text-white disabled:opacity-30"
			>
				→
			</button>
		</footer>
	{/if}
</div>
