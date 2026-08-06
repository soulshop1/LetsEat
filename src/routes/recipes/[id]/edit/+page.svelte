<script lang="ts">
	import RecipeForm from '$lib/components/RecipeForm.svelte';

	let { data, form } = $props();
</script>

<svelte:head>
	<title>Edit: {data.recipe.title} — Let's Eat!</title>
</svelte:head>

<h1 class="mb-4 text-lg font-semibold">Edit recipe</h1>
<RecipeForm
	courses={data.courses}
	photos={data.photos}
	error={form?.error ?? ''}
	submitLabel="Save changes"
	values={{
		title: data.recipe.title as string,
		description: data.recipe.description as string,
		course_id: (data.recipe.course_id as string) ?? '',
		servings: data.recipe.servings as number | null,
		servings_unit: data.recipe.servings_unit as string,
		prep_min: data.recipe.prep_min as number | null,
		cook_min: data.recipe.cook_min as number | null,
		ingredients: data.ingredientsText,
		steps: data.stepsText,
		tags: data.tagsText,
		notes: data.recipe.notes as string,
		source_name: data.recipe.source_name as string,
		source_url: data.recipe.source_url as string
	}}
/>
