import Foundation
import SwiftData

enum SampleData {
    static func seedIfEmpty(context: ModelContext) {
        let descriptor = FetchDescriptor<Recipe>()
        let count = (try? context.fetchCount(descriptor)) ?? 0
        guard count == 0 else { return }

        let weeknight = Folder(name: "Weeknight", position: 0)
        let baking = Folder(name: "Baking", position: 1)
        context.insert(weeknight)
        context.insert(baking)

        let pasta = Recipe(
            title: "Lemon Garlic Pasta",
            recipeDescription: "Bright weeknight pasta with lemon, garlic, and parsley.",
            servings: 2,
            prepMinutes: 10,
            cookMinutes: 15,
            isFavorite: true,
            sourceName: "Sample"
        )
        pasta.ingredients = [
            IngredientLine(position: 0, rawText: "8 oz spaghetti", qty: 8, unit: "oz", item: "spaghetti"),
            IngredientLine(position: 1, rawText: "3 cloves garlic, sliced", qty: 3, unit: "cloves", item: "garlic"),
            IngredientLine(position: 2, rawText: "1 lemon, zest + juice", qty: 1, unit: nil, item: "lemon"),
            IngredientLine(position: 3, rawText: "2 tbsp olive oil", qty: 2, unit: "tbsp", item: "olive oil"),
            IngredientLine(position: 4, rawText: "Salt and pepper")
        ]
        pasta.steps = [
            Step(position: 0, body: "Boil pasta in salted water until al dente. Reserve ½ cup pasta water."),
            Step(position: 1, body: "Warm olive oil and gently cook garlic until fragrant."),
            Step(position: 2, body: "Toss pasta with garlic oil, lemon, and a splash of pasta water. Season.")
        ]
        pasta.folders = [weeknight]

        let muffins = Recipe(
            title: "Blueberry Muffins",
            recipeDescription: "Tender muffins with a crunchy sugar top.",
            servings: 12,
            servingsUnit: "muffins",
            prepMinutes: 15,
            cookMinutes: 22,
            sourceName: "Sample"
        )
        muffins.ingredients = [
            IngredientLine(position: 0, rawText: "2 cups flour", qty: 2, unit: "cups", item: "flour"),
            IngredientLine(position: 1, rawText: "¾ cup sugar", qty: 0.75, unit: "cup", item: "sugar"),
            IngredientLine(position: 2, rawText: "1 ½ cups blueberries", qty: 1.5, unit: "cups", item: "blueberries")
        ]
        muffins.steps = [
            Step(position: 0, body: "Mix dry ingredients. Fold in wet and berries."),
            Step(position: 1, body: "Bake at 375°F for 20–22 minutes.")
        ]
        muffins.folders = [baking]

        context.insert(pasta)
        context.insert(muffins)
        try? context.save()
    }
}
