<script lang="ts">
	let { form } = $props();
</script>

<svelte:head>
	<title>Set up — Let's Eat!</title>
</svelte:head>

<div class="mx-auto max-w-sm py-16">
	<h1 class="mb-1 text-lg font-semibold">Welcome!</h1>
	<p class="mb-6 text-sm text-stone-500 dark:text-stone-400">
		Choose a password to protect your recipe library. You'll use it to log in from any device on
		your network.
	</p>
	<form method="POST" class="flex flex-col gap-3">
		<label class="flex flex-col gap-1 text-sm font-medium">
			Password
			<input
				type="password"
				name="password"
				required
				minlength="8"
				autocomplete="new-password"
				class="rounded-md border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
			/>
		</label>
		<label class="flex flex-col gap-1 text-sm font-medium">
			Confirm password
			<input
				type="password"
				name="confirm"
				required
				minlength="8"
				autocomplete="new-password"
				class="rounded-md border border-stone-300 bg-white px-3 py-2 dark:border-stone-700 dark:bg-stone-900"
			/>
		</label>
		{#if form?.error}
			<p class="text-sm text-red-600 dark:text-red-400">{form.error}</p>
		{/if}
		<button
			class="mt-2 rounded-md bg-orange-600 px-3 py-2 font-medium text-white hover:bg-orange-700"
		>
			Set password
		</button>
	</form>
</div>
