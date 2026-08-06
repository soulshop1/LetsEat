import { describe, expect, it } from 'vitest';
import { extractRecipe, guardImportUrl, parseDurationMin } from './url-import';

const page = (ld: unknown) =>
	`<html><head><title>Some Page — Example Site</title>
	 <script type="application/ld+json">${JSON.stringify(ld)}</script></head><body></body></html>`;

describe('guardImportUrl', () => {
	it('accepts normal https URLs', () => {
		expect(guardImportUrl('https://example.com/recipe').url).toBeDefined();
	});

	it('rejects non-http schemes, localhost, and private ranges', () => {
		expect(guardImportUrl('file:///etc/passwd').error).toBeDefined();
		expect(guardImportUrl('http://localhost/x').error).toBeDefined();
		expect(guardImportUrl('http://127.0.0.1/x').error).toBeDefined();
		expect(guardImportUrl('http://10.1.2.3/x').error).toBeDefined();
		expect(guardImportUrl('http://172.20.0.1/x').error).toBeDefined();
		expect(guardImportUrl('http://192.168.1.10/x').error).toBeDefined();
		expect(guardImportUrl('http://169.254.169.254/x').error).toBeDefined();
		expect(guardImportUrl('http://[::1]/x').error).toBeDefined();
		expect(guardImportUrl('not a url').error).toBeDefined();
	});
});

describe('parseDurationMin', () => {
	it('parses ISO-8601 durations', () => {
		expect(parseDurationMin('PT30M')).toBe(30);
		expect(parseDurationMin('PT1H30M')).toBe(90);
		expect(parseDurationMin('PT1H')).toBe(60);
		expect(parseDurationMin('P1DT2H')).toBe(1560);
		expect(parseDurationMin('PT0M')).toBeNull();
		expect(parseDurationMin('garbage')).toBeNull();
	});
});

describe('extractRecipe', () => {
	const fullLd = {
		'@context': 'https://schema.org',
		'@type': 'Recipe',
		name: 'Chicken Tikka Masala',
		description: 'Creamy &amp; rich.',
		author: { '@type': 'Person', name: 'A Cook' },
		recipeYield: '4 servings',
		prepTime: 'PT20M',
		cookTime: 'PT40M',
		recipeIngredient: ['1 lb chicken', '2 cups cream'],
		recipeInstructions: [
			{ '@type': 'HowToStep', text: 'Marinate the chicken.' },
			{ '@type': 'HowToStep', text: 'Simmer in sauce.' }
		],
		keywords: 'indian, curry',
		recipeCuisine: 'Indian',
		recipeCategory: 'Dinner',
		image: ['https://example.com/photo.jpg']
	};

	it('extracts a full plain Recipe node', () => {
		const r = extractRecipe(page(fullLd), 'https://www.example.com/tikka');
		expect(r).toMatchObject({
			title: 'Chicken Tikka Masala',
			description: 'Creamy & rich.',
			servings: 4,
			prepMin: 20,
			cookMin: 40,
			sourceName: 'A Cook',
			imageUrl: 'https://example.com/photo.jpg',
			courseName: 'Dinner'
		});
		expect(r?.ingredientsText).toBe('1 lb chicken\n2 cups cream');
		expect(r?.stepsText).toBe('Marinate the chicken.\nSimmer in sauce.');
		expect(r?.tagsText).toContain('indian');
		expect(r?.tagsText).toContain('curry');
	});

	it('finds the Recipe inside an @graph', () => {
		const graph = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite' }, fullLd] };
		expect(extractRecipe(page(graph), 'https://example.com/x')?.title).toBe(
			'Chicken Tikka Masala'
		);
	});

	it('handles @type arrays and HowToSection groupings', () => {
		const ld = {
			'@type': ['Recipe', 'NewsArticle'],
			name: 'Layered Cake',
			recipeInstructions: [
				{
					'@type': 'HowToSection',
					name: 'Cake',
					itemListElement: [{ '@type': 'HowToStep', text: 'Bake the layers.' }]
				},
				{
					'@type': 'HowToSection',
					name: 'Frosting',
					itemListElement: [{ '@type': 'HowToStep', text: 'Whip the butter.' }]
				}
			]
		};
		const r = extractRecipe(page(ld), 'https://example.com/cake');
		expect(r?.stepsText).toBe('# Cake\nBake the layers.\n# Frosting\nWhip the butter.');
	});

	it('falls back to the source hostname when there is no author', () => {
		const ld = { '@type': 'Recipe', name: 'Toast', recipeIngredient: ['bread'] };
		const r = extractRecipe(page(ld), 'https://www.bread.example.com/toast');
		expect(r?.sourceName).toBe('bread.example.com');
	});

	it('returns null when no Recipe JSON-LD exists', () => {
		expect(extractRecipe(page({ '@type': 'WebSite' }), 'https://example.com')).toBeNull();
		expect(extractRecipe('<html><head></head></html>', 'https://example.com')).toBeNull();
	});

	it('survives malformed JSON-LD blocks and uses the next valid one', () => {
		const html = `<script type="application/ld+json">{broken</script>` + page(fullLd);
		expect(extractRecipe(html, 'https://example.com')?.title).toBe('Chicken Tikka Masala');
	});
});
