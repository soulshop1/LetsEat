import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csrf: {
			// LAN app reached by varying IPs/hostnames, so a fixed ORIGIN can't be
			// assumed; CSRF relies on SameSite=Lax session cookies instead.
			trustedOrigins: ['*']
		}
	}
};

export default config;
