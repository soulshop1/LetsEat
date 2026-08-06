<script lang="ts">
	import '../app.css';

	let { data, children } = $props();
</script>

<div class="mx-auto flex min-h-dvh max-w-5xl flex-col px-4">
	<header class="flex items-center justify-between py-4">
		<a href="/" class="text-xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
			Let's Eat!
		</a>
		{#if data.authed}
			<nav class="flex items-center gap-1 text-sm">
				<a
					href="/import"
					class="rounded-md px-3 py-1.5 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
				>
					Import
				</a>
				<a
					href="/settings"
					class="rounded-md px-3 py-1.5 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
				>
					Settings
				</a>
				<form method="POST" action="/logout">
					<button
						class="rounded-md px-3 py-1.5 text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-800"
					>
						Log out
					</button>
				</form>
			</nav>
		{/if}
	</header>
	<main class="flex-1 pb-8">
		{@render children()}
	</main>
</div>
