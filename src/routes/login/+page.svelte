<script lang="ts">
	let { form } = $props();
</script>

<svelte:head>
	<title>Log in — Let's Eat!</title>
</svelte:head>

<div class="mx-auto max-w-sm py-16">
	<h1 class="mb-6 text-lg font-semibold">Log in</h1>
	<form method="POST" class="flex flex-col gap-3">
		<label class="flex flex-col gap-1 text-sm font-medium">
			Password
			<input
				type="password"
				name="password"
				required
				autocomplete="current-password"
				class="rounded-md border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
			/>
		</label>
		{#if form?.error}
			<p class="text-sm text-red-600 dark:text-red-400">{form.error}</p>
		{/if}
		<button
			class="mt-2 rounded-md bg-orange-600 px-3 py-2 font-medium text-white hover:bg-orange-700"
		>
			Log in
		</button>
	</form>
</div>
