/**
 * Import a recipe from a web page via its schema.org/Recipe JSON-LD markup.
 * Extraction is best-effort: everything lands in the review form before saving.
 */

import net from 'node:net';

export interface ExtractedRecipe {
	title: string;
	description: string;
	servings: number | null;
	prepMin: number | null;
	cookMin: number | null;
	ingredientsText: string;
	stepsText: string;
	tagsText: string;
	courseName: string;
	sourceName: string;
	sourceUrl: string;
	imageUrl: string;
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;

function isPrivateHost(hostname: string): boolean {
	const h = hostname.toLowerCase();
	if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
	if (net.isIP(h.replace(/^\[|\]$/g, ''))) {
		const ip = h.replace(/^\[|\]$/g, '');
		if (net.isIPv6(ip)) {
			return ip === '::1' || ip.startsWith('fe80') || ip.startsWith('fc') || ip.startsWith('fd');
		}
		const parts = ip.split('.').map(Number);
		return (
			parts[0] === 127 ||
			parts[0] === 10 ||
			parts[0] === 0 ||
			(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
			(parts[0] === 192 && parts[1] === 168) ||
			(parts[0] === 169 && parts[1] === 254)
		);
	}
	return false;
}

export function guardImportUrl(raw: string): { url?: URL; error?: string } {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		return { error: 'That does not look like a valid URL.' };
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		return { error: 'Only http and https URLs can be imported.' };
	}
	if (isPrivateHost(url.hostname)) {
		return { error: 'URLs on private networks cannot be imported.' };
	}
	return { url };
}

/** Fetches a page with a size cap and timeout. Returns the final URL and body text. */
export async function fetchPage(url: URL): Promise<{ finalUrl: string; html: string }> {
	const res = await fetch(url, {
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		headers: {
			'user-agent': 'Mozilla/5.0 (compatible; LetsEat/1.0; +self-hosted recipe manager)',
			accept: 'text/html,application/xhtml+xml'
		}
	});
	if (!res.ok) throw new Error(`The site responded with ${res.status}.`);
	const guarded = guardImportUrl(res.url || url.href);
	if (guarded.error) throw new Error('The site redirected somewhere unsafe.');

	const reader = res.body?.getReader();
	if (!reader) throw new Error('Empty response.');
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > MAX_BYTES) {
			reader.cancel();
			throw new Error('The page is too large to import.');
		}
		chunks.push(value);
	}
	return { finalUrl: res.url || url.href, html: Buffer.concat(chunks).toString('utf8') };
}

/** "PT1H30M" → 90; also accepts bare minutes ("90"). */
export function parseDurationMin(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
	if (typeof value !== 'string') return null;
	const s = value.trim();
	if (/^\d+$/.test(s)) return parseInt(s);
	const m = s.match(/^P(?:(\d+)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
	if (!m) return null;
	const min =
		(m[1] ? parseInt(m[1]) * 1440 : 0) +
		(m[2] ? parseFloat(m[2]) * 60 : 0) +
		(m[3] ? parseFloat(m[3]) : 0) +
		(m[4] ? parseFloat(m[4]) / 60 : 0);
	return min > 0 ? Math.round(min) : null;
}

function parseYield(value: unknown): number | null {
	const first = Array.isArray(value) ? value[0] : value;
	if (typeof first === 'number' && Number.isFinite(first)) return first;
	if (typeof first === 'string') {
		const m = first.match(/\d+(?:\.\d+)?/);
		if (m) return parseFloat(m[0]);
	}
	return null;
}

function asText(value: unknown): string {
	if (typeof value === 'string') return decodeEntities(value.trim());
	if (Array.isArray(value)) return asText(value[0]);
	if (value && typeof value === 'object') {
		const o = value as Record<string, unknown>;
		if (typeof o.name === 'string') return decodeEntities(o.name.trim());
		if (typeof o['@value'] === 'string') return decodeEntities((o['@value'] as string).trim());
	}
	return '';
}

function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;|&apos;|&#x27;/gi, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n)))
		.replace(/<[^>]+>/g, '')
		.trim();
}

function instructionLines(value: unknown, depth = 0): string[] {
	if (depth > 3 || value == null) return [];
	if (typeof value === 'string') {
		// A single blob: split on newlines.
		return value
			.split(/\n+/)
			.map((s) => decodeEntities(s))
			.filter(Boolean);
	}
	if (Array.isArray(value)) {
		return value.flatMap((v) => instructionLines(v, depth + 1));
	}
	if (typeof value === 'object') {
		const o = value as Record<string, unknown>;
		const type = String(o['@type'] ?? '');
		if (type.includes('HowToSection')) {
			const name = asText(o.name);
			const inner = instructionLines(o.itemListElement, depth + 1);
			return name ? [`# ${name}`, ...inner] : inner;
		}
		if (typeof o.text === 'string') return [decodeEntities(o.text)];
		if (o.itemListElement) return instructionLines(o.itemListElement, depth + 1);
		if (typeof o.name === 'string') return [decodeEntities(o.name)];
	}
	return [];
}

function imageUrlOf(value: unknown): string {
	if (typeof value === 'string') return value;
	if (Array.isArray(value)) return imageUrlOf(value[0]);
	if (value && typeof value === 'object') {
		const o = value as Record<string, unknown>;
		if (typeof o.url === 'string') return o.url;
	}
	return '';
}

function tagList(value: unknown): string[] {
	if (typeof value === 'string') return value.split(',').map((s) => s.trim().toLowerCase());
	if (Array.isArray(value)) return value.flatMap((v) => tagList(v));
	return [];
}

function isRecipeNode(node: unknown): node is Record<string, unknown> {
	if (!node || typeof node !== 'object') return false;
	const t = (node as Record<string, unknown>)['@type'];
	if (typeof t === 'string') return t.toLowerCase() === 'recipe';
	if (Array.isArray(t)) return t.some((x) => String(x).toLowerCase() === 'recipe');
	return false;
}

function findRecipeNode(data: unknown, depth = 0): Record<string, unknown> | null {
	if (depth > 4 || data == null) return null;
	if (isRecipeNode(data)) return data;
	if (Array.isArray(data)) {
		for (const item of data) {
			const found = findRecipeNode(item, depth + 1);
			if (found) return found;
		}
		return null;
	}
	if (typeof data === 'object') {
		const o = data as Record<string, unknown>;
		if (o['@graph']) return findRecipeNode(o['@graph'], depth + 1);
		if (o.mainEntity) return findRecipeNode(o.mainEntity, depth + 1);
	}
	return null;
}

export function pageTitle(html: string): string {
	const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	return m ? decodeEntities(m[1]).slice(0, 200) : '';
}

/** Extracts the first schema.org/Recipe from JSON-LD blocks; null when none found. */
export function extractRecipe(html: string, sourceUrl: string): ExtractedRecipe | null {
	const blocks = [
		...html.matchAll(
			/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
		)
	];
	for (const block of blocks) {
		let data: unknown;
		try {
			data = JSON.parse(block[1]);
		} catch {
			continue;
		}
		const node = findRecipeNode(data);
		if (!node) continue;

		const ingredients = (
			Array.isArray(node.recipeIngredient)
				? node.recipeIngredient
				: Array.isArray(node.ingredients)
					? node.ingredients
					: []
		)
			.map((v) => decodeEntities(String(v)))
			.filter(Boolean);

		const tags = new Set<string>([
			...tagList(node.keywords),
			...tagList(node.recipeCuisine)
		]);

		return {
			title: asText(node.name) || pageTitle(html),
			description: asText(node.description),
			servings: parseYield(node.recipeYield ?? node.yield),
			prepMin: parseDurationMin(node.prepTime),
			cookMin: parseDurationMin(node.cookTime),
			ingredientsText: ingredients.join('\n'),
			stepsText: instructionLines(node.recipeInstructions).join('\n'),
			tagsText: [...tags].filter((t) => t.length > 0 && t.length < 40).slice(0, 10).join(', '),
			courseName: asText(node.recipeCategory),
			sourceName: asText(node.author) || new URL(sourceUrl).hostname.replace(/^www\./, ''),
			sourceUrl,
			imageUrl: imageUrlOf(node.image)
		};
	}
	return null;
}
