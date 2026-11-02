import Foundation
import SwiftData

@Model
final class Recipe {
    var id: UUID
    var title: String
    var recipeDescription: String
    var servings: Double?
    var servingsUnit: String
    var prepMinutes: Int?
    var cookMinutes: Int?
    var rating: Int
    var isFavorite: Bool
    var notes: String
    var sourceName: String
    var sourceURL: String
    var createdAt: Date
    var updatedAt: Date

    @Relationship(deleteRule: .cascade, inverse: \IngredientLine.recipe)
    var ingredients: [IngredientLine]

    @Relationship(deleteRule: .cascade, inverse: \Step.recipe)
    var steps: [Step]

    @Relationship(deleteRule: .cascade, inverse: \RecipePhoto.recipe)
    var photos: [RecipePhoto]

    @Relationship(deleteRule: .cascade, inverse: \CookLogEntry.recipe)
    var cookLog: [CookLogEntry]

    @Relationship(inverse: \Folder.recipes)
    var folders: [Folder]

    @Relationship(inverse: \Tag.recipes)
    var tags: [Tag]

    var totalMinutes: Int? {
        switch (prepMinutes, cookMinutes) {
        case (nil, nil): return nil
        default: return (prepMinutes ?? 0) + (cookMinutes ?? 0)
        }
    }

    var coverPhoto: RecipePhoto? {
        photos.sorted { $0.position < $1.position }.first
    }

    init(
        title: String,
        recipeDescription: String = "",
        servings: Double? = nil,
        servingsUnit: String = "servings",
        prepMinutes: Int? = nil,
        cookMinutes: Int? = nil,
        rating: Int = 0,
        isFavorite: Bool = false,
        notes: String = "",
        sourceName: String = "",
        sourceURL: String = ""
    ) {
        self.id = UUID()
        self.title = title
        self.recipeDescription = recipeDescription
        self.servings = servings
        self.servingsUnit = servingsUnit
        self.prepMinutes = prepMinutes
        self.cookMinutes = cookMinutes
        self.rating = rating
        self.isFavorite = isFavorite
        self.notes = notes
        self.sourceName = sourceName
        self.sourceURL = sourceURL
        self.createdAt = Date()
        self.updatedAt = Date()
        self.ingredients = []
        self.steps = []
        self.photos = []
        self.cookLog = []
        self.folders = []
        self.tags = []
    }
}

@Model
final class IngredientLine {
    var id: UUID
    var position: Int
    var rawText: String
    var qty: Double?
    var unit: String?
    var item: String?
    var isHeading: Bool
    var recipe: Recipe?

    init(
        position: Int,
        rawText: String,
        qty: Double? = nil,
        unit: String? = nil,
        item: String? = nil,
        isHeading: Bool = false
    ) {
        self.id = UUID()
        self.position = position
        self.rawText = rawText
        self.qty = qty
        self.unit = unit
        self.item = item
        self.isHeading = isHeading
    }
}

@Model
final class Step {
    var id: UUID
    var position: Int
    var body: String
    var isHeading: Bool
    var recipe: Recipe?

    init(position: Int, body: String, isHeading: Bool = false) {
        self.id = UUID()
        self.position = position
        self.body = body
        self.isHeading = isHeading
    }
}

@Model
final class RecipePhoto {
    var id: UUID
    var position: Int
    var filename: String
    var createdAt: Date
    @Attribute(.externalStorage) var imageData: Data?
    var recipe: Recipe?

    init(position: Int, filename: String, imageData: Data? = nil) {
        self.id = UUID()
        self.position = position
        self.filename = filename
        self.imageData = imageData
        self.createdAt = Date()
    }
}

@Model
final class Tag {
    var id: UUID
    var name: String
    var recipes: [Recipe]

    init(name: String) {
        self.id = UUID()
        self.name = name
        self.recipes = []
    }
}

@Model
final class Folder {
    var id: UUID
    var name: String
    var position: Int
    var createdAt: Date
    var recipes: [Recipe]

    init(name: String, position: Int = 0) {
        self.id = UUID()
        self.name = name
        self.position = position
        self.createdAt = Date()
        self.recipes = []
    }
}

@Model
final class CookLogEntry {
    var id: UUID
    var cookedOn: Date
    var note: String?
    var recipe: Recipe?

    init(cookedOn: Date = Date(), note: String? = nil) {
        self.id = UUID()
        self.cookedOn = cookedOn
        self.note = note
    }
}

@Model
final class GroceryList {
    var id: UUID
    var name: String
    var createdAt: Date
    @Relationship(deleteRule: .cascade, inverse: \GroceryItem.list)
    var items: [GroceryItem]

    init(name: String = "Grocery") {
        self.id = UUID()
        self.name = name
        self.createdAt = Date()
        self.items = []
    }
}

@Model
final class GroceryItem {
    var id: UUID
    var name: String
    var isChecked: Bool
    var groupName: String
    var position: Int
    var list: GroceryList?

    init(name: String, groupName: String = "Other", position: Int = 0) {
        self.id = UUID()
        self.name = name
        self.isChecked = false
        self.groupName = groupName
        self.position = position
    }
}
