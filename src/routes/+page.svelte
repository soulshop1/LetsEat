<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Let's Eat!</title>
</svelte:head>

{#if data.recipeCount === 0}
	<div class="flex flex-col items-center gap-3 py-24 text-center">
		<p class="text-4xl">🍳</p>
		<h1 class="text-lg font-semibold">Your library is empty</h1>
		<p class="max-w-sm text-sm text-stone-500 dark:text-stone-400">
			Recipe creation and importing arrive in the next phase. The app shell, database, and login
			are up and running.
		</p>
	</div>
{:else}
	<p class="text-sm text-stone-500">{data.recipeCount} recipes in your library.</p>
{/if}
