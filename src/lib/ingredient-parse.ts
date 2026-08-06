/**
 * Best-effort parsing of free-text ingredient lines into (qty, unit, item) so
 * the serving scaler can adjust quantities. The raw text is always preserved;
 * lines that don't parse simply scale as-is (displayed unchanged).
 */

export interface ParsedIngredient {
	raw: string;
	qty: number | null;
	unit: string | null;
	item: string | null;
	isHeading: boolean;
}

const UNICODE_FRACTIONS: Record<string, number> = {
	'½': 1 / 2,
	'⅓': 1 / 3,
	'⅔': 2 / 3,
	'¼': 1 / 4,
	'¾': 3 / 4,
	'⅕': 1 / 5,
	'⅖': 2 / 5,
	'⅗': 3 / 5,
	'⅘': 4 / 5,
	'⅙': 1 / 6,
	'⅚': 5 / 6,
	'⅛': 1 / 8,
	'⅜': 3 / 8,
	'⅝': 5 / 8,
	'⅞': 7 / 8
};

const UNITS = new Set([
	'cup',
	'cups',
	'c',
	'tablespoon',
	'tablespoons',
	'tbsp',
	'tbs',
	'teaspoon',
	'teaspoons',
	'tsp',
	'ounce',
	'ounces',
	'oz',
	'pound',
	'pounds',
	'lb',
	'lbs',
	'gram',
	'grams',
	'g',
	'kilogram',
	'kilograms',
	'kg',
	'milliliter',
	'milliliters',
	'ml',
	'liter',
	'liters',
	'litre',
	'litres',
	'l',
	'quart',
	'quarts',
	'qt',
	'pint',
	'pints',
	'pt',
	'gallon',
	'gallons',
	'gal',
	'pinch',
	'pinches',
	'dash',
	'dashes',
	'clove',
	'cloves',
	'can',
	'cans',
	'jar',
	'jars',
	'stick',
	'sticks',
	'slice',
	'slices',
	'piece',
	'pieces',
	'bunch',
	'bunches',
	'handful',
	'handfuls',
	'sprig',
	'sprigs',
	'head',
	'heads',
	'stalk',
	'stalks',
	'package',
	'packages',
	'pkg',
	'bag',
	'bags',
	'box',
	'boxes',
	'sheet',
	'sheets',
	'fillet',
	'fillets',
	'ear',
	'ears'
]);

/** Reads a number from the start of `text`: "1", "1.5", "1/2", "1 1/2", "1½", "½". */
function readQuantity(text: string): { qty: number; rest: string } | null {
	// Mixed number: "1 1/2"
	let m = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*/);
	if (m && parseInt(m[3]) !== 0) {
		return { qty: parseInt(m[1]) + parseInt(m[2]) / parseInt(m[3]), rest: text.slice(m[0].length) };
	}
	// Pure fraction: "1/2"
	m = text.match(/^(\d+)\s*\/\s*(\d+)\s*/);
	if (m && parseInt(m[2]) !== 0) {
		return { qty: parseInt(m[1]) / parseInt(m[2]), rest: text.slice(m[0].length) };
	}
	// Decimal or whole number, optionally followed by a unicode fraction: "1.5", "2", "1½"
	m = text.match(/^(\d+(?:\.\d+)?)\s*/);
	if (m) {
		let qty = parseFloat(m[1]);
		let rest = text.slice(m[0].length);
		const uni = rest.match(/^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*/);
		if (uni && !m[1].includes('.')) {
			qty += UNICODE_FRACTIONS[uni[1]];
			rest = rest.slice(uni[0].length);
		}
		return { qty, rest };
	}
	// Unicode fraction alone: "½"
	const uni = text.match(/^([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*/);
	if (uni) {
		return { qty: UNICODE_FRACTIONS[uni[1]], rest: text.slice(uni[0].length) };
	}
	return null;
}

export function parseIngredientLine(line: string): ParsedIngredient {
	const raw = line.trim();
	if (raw.startsWith('#')) {
		return { raw: raw.replace(/^#+\s*/, ''), qty: null, unit: null, item: null, isHeading: true };
	}

	const q = readQuantity(raw);
	if (!q) {
		return { raw, qty: null, unit: null, item: raw || null, isHeading: false };
	}

	let rest = q.rest;
	let unit: string | null = null;
	const word = rest.match(/^([A-Za-z]+)\.?\s+/);
	if (word && UNITS.has(word[1].toLowerCase())) {
		unit = word[1].toLowerCase();
		rest = rest.slice(word[0].length);
	}

	const item = rest.replace(/^of\s+/i, '').trim() || null;
	return { raw, qty: q.qty, unit, item, isHeading: false };
}

const FRACTION_GLYPHS: [number, string][] = [
	[1 / 8, '⅛'],
	[1 / 6, '⅙'],
	[1 / 4, '¼'],
	[1 / 3, '⅓'],
	[3 / 8, '⅜'],
	[1 / 2, '½'],
	[5 / 8, '⅝'],
	[2 / 3, '⅔'],
	[3 / 4, '¾'],
	[5 / 6, '⅚'],
	[7 / 8, '⅞']
];

/** Formats a quantity with kitchen-friendly fractions: 0.5 → "½", 1.5 → "1½", 2.25 → "2¼". */
export function formatQty(n: number): string {
	if (n <= 0) return '0';
	const whole = Math.floor(n);
	const frac = n - whole;
	const EPS = 0.02;
	if (frac < EPS) return String(whole);
	for (const [value, glyph] of FRACTION_GLYPHS) {
		if (Math.abs(frac - value) < EPS) {
			return whole > 0 ? `${whole}${glyph}` : glyph;
		}
	}
	const rounded = Math.round(n * 100) / 100;
	return String(rounded);
}

/** Scales a parsed line's quantity and re-renders it; unparsed lines pass through. */
export function scaleLine(p: ParsedIngredient, factor: number): { text: string; scaled: boolean } {
	if (p.isHeading || p.qty === null || factor === 1) {
		return { text: p.raw, scaled: p.qty !== null };
	}
	const qty = formatQty(p.qty * factor);
	const unit = p.unit ? `${p.unit} ` : '';
	return { text: `${qty} ${unit}${p.item ?? ''}`.trim(), scaled: true };
}
