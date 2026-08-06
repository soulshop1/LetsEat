import { sql } from 'drizzle-orm';
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	tokenHash: text('token_hash').notNull().unique(),
	createdAt: text('created_at').notNull(),
	expiresAt: text('expires_at').notNull()
});

export const courses = sqliteTable('courses', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique(),
	position: integer('position').notNull()
});

export const recipes = sqliteTable('recipes', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	description: text('description').notNull().default(''),
	courseId: text('course_id').references(() => courses.id, { onDelete: 'set null' }),
	servings: real('servings'),
	servingsUnit: text('servings_unit').notNull().default('servings'),
	prepMin: integer('prep_min'),
	cookMin: integer('cook_min'),
	totalMin: integer('total_min').generatedAlwaysAs(
		sql`CASE WHEN prep_min IS NULL AND cook_min IS NULL THEN NULL ELSE COALESCE(prep_min, 0) + COALESCE(cook_min, 0) END`,
		{ mode: 'virtual' }
	),
	rating: integer('rating').notNull().default(0),
	isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
	notes: text('notes').notNull().default(''),
	sourceName: text('source_name').notNull().default(''),
	sourceUrl: text('source_url').notNull().default(''),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull()
});

export const ingredients = sqliteTable('ingredients', {
	id: text('id').primaryKey(),
	recipeId: text('recipe_id')
		.notNull()
		.references(() => recipes.id, { onDelete: 'cascade' }),
	position: integer('position').notNull(),
	rawText: text('raw_text').notNull(),
	qty: real('qty'),
	unit: text('unit'),
	item: text('item'),
	isHeading: integer('is_heading', { mode: 'boolean' }).notNull().default(false)
});

export const steps = sqliteTable('steps', {
	id: text('id').primaryKey(),
	recipeId: text('recipe_id')
		.notNull()
		.references(() => recipes.id, { onDelete: 'cascade' }),
	position: integer('position').notNull(),
	body: text('body').notNull(),
	isHeading: integer('is_heading', { mode: 'boolean' }).notNull().default(false)
});

export const photos = sqliteTable('photos', {
	id: text('id').primaryKey(),
	recipeId: text('recipe_id')
		.notNull()
		.references(() => recipes.id, { onDelete: 'cascade' }),
	position: integer('position').notNull(),
	filename: text('filename').notNull(),
	width: integer('width').notNull(),
	height: integer('height').notNull(),
	createdAt: text('created_at').notNull()
});

export const tags = sqliteTable('tags', {
	id: text('id').primaryKey(),
	name: text('name').notNull().unique()
});

export const recipeTags = sqliteTable(
	'recipe_tags',
	{
		recipeId: text('recipe_id')
			.notNull()
			.references(() => recipes.id, { onDelete: 'cascade' }),
		tagId: text('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(t) => [primaryKey({ columns: [t.recipeId, t.tagId] })]
);

export const cookLog = sqliteTable('cook_log', {
	id: text('id').primaryKey(),
	recipeId: text('recipe_id')
		.notNull()
		.references(() => recipes.id, { onDelete: 'cascade' }),
	cookedOn: text('cooked_on').notNull(),
	note: text('note')
});
