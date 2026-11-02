import Foundation
import SwiftData

enum RecipeFactory {
    @discardableResult
    static func save(draft: ImportDraft, context: ModelContext) throws -> Recipe {
        let recipe = Recipe(
            title: draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ? "Untitled recipe"
                : draft.title.trimmingCharacters(in: .whitespacesAndNewlines),
            recipeDescription: draft.recipeDescription,
            servings: draft.servings,
            servingsUnit: draft.servingsUnit,
            prepMinutes: draft.prepMinutes,
            cookMinutes: draft.cookMinutes,
            notes: draft.notes,
            sourceName: draft.sourceName,
            sourceURL: draft.sourceURL
        )
        recipe.ingredients = IngredientParser.lines(from: draft.ingredientsText)
        recipe.steps = IngredientParser.stepLines(from: draft.stepsText)

        if let folderName = draft.folderName?.trimmingCharacters(in: .whitespacesAndNewlines),
           !folderName.isEmpty {
            let folder = try findOrCreateFolder(named: folderName, context: context)
            recipe.folders = [folder]
        }

        context.insert(recipe)
        try context.save()
        return recipe
    }

    private static func findOrCreateFolder(named name: String, context: ModelContext) throws -> Folder {
        let descriptor = FetchDescriptor<Folder>(predicate: #Predicate { $0.name == name })
        if let existing = try context.fetch(descriptor).first {
            return existing
        }
        let count = try context.fetchCount(FetchDescriptor<Folder>())
        let folder = Folder(name: name, position: count)
        context.insert(folder)
        return folder
    }
}
