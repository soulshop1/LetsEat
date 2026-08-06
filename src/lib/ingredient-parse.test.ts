import { describe, expect, it } from 'vitest';
import { formatQty, parseIngredientLine, scaleLine } from './ingredient-parse';

describe('parseIngredientLine', () => {
	it('parses whole numbers with units', () => {
		expect(parseIngredientLine('2 cups flour')).toMatchObject({
			qty: 2,
			unit: 'cups',
			item: 'flour'
		});
	});

	it('parses decimals, slash fractions, and mixed numbers', () => {
		expect(parseIngredientLine('1.5 tsp vanilla').qty).toBe(1.5);
		expect(parseIngredientLine('1/2 cup sugar').qty).toBe(0.5);
		expect(parseIngredientLine('1 1/2 cups milk').qty).toBe(1.5);
	});

	it('parses unicode fractions, alone and mixed', () => {
		expect(parseIngredientLine('½ cup butter').qty).toBe(0.5);
		expect(parseIngredientLine('1½ cups broth').qty).toBe(1.5);
	});

	it('strips a leading "of" from the item', () => {
		expect(parseIngredientLine('1 pinch of salt')).toMatchObject({
			qty: 1,
			unit: 'pinch',
			item: 'salt'
		});
	});

	it('treats unknown first words as part of the item, not a unit', () => {
		expect(parseIngredientLine('2 large eggs')).toMatchObject({
			qty: 2,
			unit: null,
			item: 'large eggs'
		});
	});

	it('leaves unparseable lines with null qty and full item', () => {
		expect(parseIngredientLine('salt to taste')).toMatchObject({
			qty: null,
			unit: null,
			item: 'salt to taste'
		});
	});

	it('recognizes headings', () => {
		expect(parseIngredientLine('# For the sauce')).toMatchObject({
			isHeading: true,
			raw: 'For the sauce'
		});
	});
});

describe('formatQty', () => {
	it('renders kitchen fractions', () => {
		expect(formatQty(0.5)).toBe('½');
		expect(formatQty(1.5)).toBe('1½');
		expect(formatQty(2.25)).toBe('2¼');
		expect(formatQty(1 / 3)).toBe('⅓');
		expect(formatQty(3)).toBe('3');
	});

	it('falls back to decimals for odd values', () => {
		expect(formatQty(1.43)).toBe('1.43');
	});
});

describe('scaleLine', () => {
	it('doubles a parsed line', () => {
		const p = parseIngredientLine('1 1/2 cups milk');
		expect(scaleLine(p, 2)).toEqual({ text: '3 cups milk', scaled: true });
	});

	it('passes unparseable lines through unchanged', () => {
		const p = parseIngredientLine('salt to taste');
		expect(scaleLine(p, 2)).toEqual({ text: 'salt to taste', scaled: false });
	});

	it('returns raw text at 1x', () => {
		const p = parseIngredientLine('2 cups flour');
		expect(scaleLine(p, 1)).toEqual({ text: '2 cups flour', scaled: true });
	});
});
