<script lang="ts">
	import RecipeForm from '$lib/components/RecipeForm.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>New recipe — Let's Eat!</title>
</svelte:head>

<h1 class="mb-4 text-lg font-semibold">New recipe</h1>
<RecipeForm courses={data.courses} error={form?.error ?? ''} submitLabel="Save recipe" />
