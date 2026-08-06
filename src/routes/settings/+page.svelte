<script lang="ts">
	let { data, form } = $props();

	const inputClass =
		'rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900';
</script>

<svelte:head>
	<title>Settings — Let's Eat!</title>
</svelte:head>

<h1 class="mb-6 text-lg font-semibold">Settings</h1>

<div class="flex max-w-xl flex-col gap-8">
	<section>
		<h2 class="mb-1 text-sm font-semibold">Library</h2>
		<p class="mb-3 text-sm text-stone-500">
			{data.counts.recipes} recipes, {data.counts.photos} photos.
		</p>
		<div class="flex gap-2">
			<a
				href="/export"
				data-sveltekit-preload-data="off"
				class="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
			>
				Export library (zip)
			</a>
			<a
				href="/import"
				class="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
			>
				Import recipes
			</a>
		</div>
		<p class="mt-2 text-xs text-stone-400">
			The export contains every recipe as JSON plus all photos. For server-side backups, copy the
			<code>data/</code> folder.
		</p>
	</section>

	<section>
		<h2 class="mb-3 text-sm font-semibold">Change password</h2>
		<form method="POST" action="?/password" class="flex max-w-sm flex-col gap-3">
			<label class="flex flex-col gap-1 text-sm font-medium">
				Current password
				<input type="password" name="current" required autocomplete="current-password" class={inputClass} />
			</label>
			<label class="flex flex-col gap-1 text-sm font-medium">
				New password
				<input type="password" name="next" required minlength="8" autocomplete="new-password" class={inputClass} />
			</label>
			<label class="flex flex-col gap-1 text-sm font-medium">
				Confirm new password
				<input type="password" name="confirm" required minlength="8" autocomplete="new-password" class={inputClass} />
			</label>
			{#if form?.error}
				<p class="text-sm text-red-600 dark:text-red-400">{form.error}</p>
			{/if}
			{#if form?.success}
				<p class="text-sm text-green-600 dark:text-green-400">{form.success}</p>
			{/if}
			<button
				class="self-start rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
			>
				Change password
			</button>
		</form>
	</section>
</div>
