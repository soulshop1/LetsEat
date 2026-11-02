import Foundation
import SwiftData
import UniformTypeIdentifiers

/// Export/import compatible with the web app's `recipes.json` (+ photos) zip shape.
enum LibraryBackup {
    struct ExportPayload: Codable {
        var app: String
        var format: Int
        var exported_at: String
        var recipes: [ExportedRecipe]
    }

    struct ExportedRecipe: Codable {
        var id: String
        var title: String
        var description: String
        var servings: Double?
        var servings_unit: String
        var prep_min: Int?
        var cook_min: Int?
        var rating: Int
        var is_favorite: Bool
        var notes: String
        var source_name: String
        var source_url: String
        var created_at: String
        var updated_at: String
        var ingredients: [ExportedIngredient]
        var steps: [ExportedStep]
        var tags: [String]
        var folders: [String]
        var photos: [ExportedPhoto]

        enum CodingKeys: String, CodingKey {
            case id, title, description, servings, servings_unit, prep_min, cook_min
            case rating, is_favorite, notes, source_name, source_url, created_at, updated_at
            case ingredients, steps, tags, folders, photos
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
            title = try c.decodeIfPresent(String.self, forKey: .title) ?? "Untitled"
            description = try c.decodeIfPresent(String.self, forKey: .description) ?? ""
            servings = try c.decodeIfPresent(Double.self, forKey: .servings)
            servings_unit = try c.decodeIfPresent(String.self, forKey: .servings_unit) ?? "servings"
            prep_min = try c.decodeIfPresent(Int.self, forKey: .prep_min)
            cook_min = try c.decodeIfPresent(Int.self, forKey: .cook_min)
            rating = try c.decodeIfPresent(Int.self, forKey: .rating) ?? 0
            if let flag = try c.decodeIfPresent(Bool.self, forKey: .is_favorite) {
                is_favorite = flag
            } else if let flag = try c.decodeIfPresent(Int.self, forKey: .is_favorite) {
                is_favorite = flag != 0
            } else {
                is_favorite = false
            }
            notes = try c.decodeIfPresent(String.self, forKey: .notes) ?? ""
            source_name = try c.decodeIfPresent(String.self, forKey: .source_name) ?? ""
            source_url = try c.decodeIfPresent(String.self, forKey: .source_url) ?? ""
            created_at = try c.decodeIfPresent(String.self, forKey: .created_at) ?? ""
            updated_at = try c.decodeIfPresent(String.self, forKey: .updated_at) ?? ""
            ingredients = try c.decodeIfPresent([ExportedIngredient].self, forKey: .ingredients) ?? []
            steps = try c.decodeIfPresent([ExportedStep].self, forKey: .steps) ?? []
            tags = try c.decodeIfPresent([String].self, forKey: .tags) ?? []
            folders = try c.decodeIfPresent([String].self, forKey: .folders) ?? []
            photos = try c.decodeIfPresent([ExportedPhoto].self, forKey: .photos) ?? []
        }

        init(
            id: String,
            title: String,
            description: String,
            servings: Double?,
            servings_unit: String,
            prep_min: Int?,
            cook_min: Int?,
            rating: Int,
            is_favorite: Bool,
            notes: String,
            source_name: String,
            source_url: String,
            created_at: String,
            updated_at: String,
            ingredients: [ExportedIngredient],
            steps: [ExportedStep],
            tags: [String],
            folders: [String],
            photos: [ExportedPhoto]
        ) {
            self.id = id
            self.title = title
            self.description = description
            self.servings = servings
            self.servings_unit = servings_unit
            self.prep_min = prep_min
            self.cook_min = cook_min
            self.rating = rating
            self.is_favorite = is_favorite
            self.notes = notes
            self.source_name = source_name
            self.source_url = source_url
            self.created_at = created_at
            self.updated_at = updated_at
            self.ingredients = ingredients
            self.steps = steps
            self.tags = tags
            self.folders = folders
            self.photos = photos
        }
    }

    struct ExportedIngredient: Codable {
        var position: Int
        var raw_text: String
        var qty: Double?
        var unit: String?
        var item: String?
        var is_heading: Bool
    }

    struct ExportedStep: Codable {
        var position: Int
        var body: String
        var is_heading: Bool
    }

    struct ExportedPhoto: Codable {
        var id: String
        var position: Int
        var filename: String
    }

    static func exportZip(context: ModelContext) throws -> Data {
        let recipes = try context.fetch(FetchDescriptor<Recipe>(sortBy: [SortDescriptor(\.createdAt)]))
        var entries: [MinimalZip.Entry] = []
        var exported: [ExportedRecipe] = []

        for recipe in recipes {
            let photoMeta: [ExportedPhoto] = recipe.photos
                .sorted { $0.position < $1.position }
                .map { ExportedPhoto(id: $0.id.uuidString, position: $0.position, filename: $0.filename) }

            for photo in recipe.photos.sorted(by: { $0.position < $1.position }) {
                if let data = photo.imageData {
                    entries.append(
                        MinimalZip.Entry(
                            path: "photos/\(recipe.id.uuidString)/\(photo.filename)",
                            data: data
                        )
                    )
                }
            }

            exported.append(
                ExportedRecipe(
                    id: recipe.id.uuidString,
                    title: recipe.title,
                    description: recipe.recipeDescription,
                    servings: recipe.servings,
                    servings_unit: recipe.servingsUnit,
                    prep_min: recipe.prepMinutes,
                    cook_min: recipe.cookMinutes,
                    rating: recipe.rating,
                    is_favorite: recipe.isFavorite,
                    notes: recipe.notes,
                    source_name: recipe.sourceName,
                    source_url: recipe.sourceURL,
                    created_at: ISO8601DateFormatter().string(from: recipe.createdAt),
                    updated_at: ISO8601DateFormatter().string(from: recipe.updatedAt),
                    ingredients: recipe.ingredients.sorted { $0.position < $1.position }.map {
                        ExportedIngredient(
                            position: $0.position,
                            raw_text: $0.rawText,
                            qty: $0.qty,
                            unit: $0.unit,
                            item: $0.item,
                            is_heading: $0.isHeading
                        )
                    },
                    steps: recipe.steps.sorted { $0.position < $1.position }.map {
                        ExportedStep(position: $0.position, body: $0.body, is_heading: $0.isHeading)
                    },
                    tags: recipe.tags.map(\.name).sorted(),
                    folders: recipe.folders.map(\.name).sorted(),
                    photos: photoMeta
                )
            )
        }

        let payload = ExportPayload(
            app: "lets-eat",
            format: AppConstants.exportFormatVersion,
            exported_at: ISO8601DateFormatter().string(from: Date()),
            recipes: exported
        )
        let json = try JSONEncoder().encode(payload)
        entries.insert(MinimalZip.Entry(path: "recipes.json", data: json), at: 0)
        return MinimalZip.create(entries: entries)
    }

    @discardableResult
    static func importZip(data: Data, context: ModelContext) throws -> Int {
        let entries = try MinimalZip.extract(data: data)
        guard let jsonEntry = entries.first(where: { $0.path == "recipes.json" || $0.path.hasSuffix("/recipes.json") }) else {
            // Also accept bare recipes.json for testing
            throw CocoaError(.fileReadCorruptFile)
        }

        let decoder = JSONDecoder()
        let payload: ExportPayload
        if let decoded = try? decoder.decode(ExportPayload.self, from: jsonEntry.data) {
            payload = decoded
        } else if let web = try? decoder.decode(WebExport.self, from: jsonEntry.data) {
            payload = web.asPayload()
        } else {
            throw CocoaError(.fileReadCorruptFile)
        }

        let photosByPath = Dictionary(uniqueKeysWithValues: entries.map { ($0.path, $0.data) })
        var imported = 0

        for item in payload.recipes {
            let recipe = Recipe(
                title: item.title,
                recipeDescription: item.description,
                servings: item.servings,
                servingsUnit: item.servings_unit,
                prepMinutes: item.prep_min,
                cookMinutes: item.cook_min,
                rating: item.rating,
                isFavorite: item.is_favorite,
                notes: item.notes,
                sourceName: item.source_name,
                sourceURL: item.source_url
            )
            if let created = ISO8601DateFormatter().date(from: item.created_at) {
                recipe.createdAt = created
            }
            recipe.ingredients = item.ingredients.map {
                IngredientLine(
                    position: $0.position,
                    rawText: $0.raw_text,
                    qty: $0.qty,
                    unit: $0.unit,
                    item: $0.item,
                    isHeading: $0.is_heading
                )
            }
            recipe.steps = item.steps.map {
                Step(position: $0.position, body: $0.body, isHeading: $0.is_heading)
            }

            for folderName in item.folders {
                let folder = try findOrCreateFolder(named: folderName, context: context)
                if !recipe.folders.contains(where: { $0.id == folder.id }) {
                    recipe.folders.append(folder)
                }
            }

            for photo in item.photos {
                let candidates = [
                    "photos/\(item.id)/\(photo.filename)",
                    "photos/\(item.id)/\(photo.filename).webp"
                ]
                let data = candidates.compactMap { photosByPath[$0] }.first
                recipe.photos.append(
                    RecipePhoto(position: photo.position, filename: photo.filename, imageData: data)
                )
            }

            context.insert(recipe)
            imported += 1
        }

        try context.save()
        return imported
    }

    private static func findOrCreateFolder(named name: String, context: ModelContext) throws -> Folder {
        let descriptor = FetchDescriptor<Folder>(predicate: #Predicate { $0.name == name })
        if let existing = try context.fetch(descriptor).first { return existing }
        let count = try context.fetchCount(FetchDescriptor<Folder>())
        let folder = Folder(name: name, position: count)
        context.insert(folder)
        return folder
    }
}

/// Shape produced by the existing SvelteKit export endpoint.
private struct WebExport: Codable {
    var app: String?
    var format: Int?
    var exported_at: String?
    var recipes: [LibraryBackup.ExportedRecipe]

    func asPayload() -> LibraryBackup.ExportPayload {
        LibraryBackup.ExportPayload(
            app: app ?? "lets-eat",
            format: format ?? 1,
            exported_at: exported_at ?? ISO8601DateFormatter().string(from: Date()),
            recipes: recipes
        )
    }
}

extension UTType {
    static var letsEatBackup: UTType {
        UTType(exportedAs: "com.letseat.backup", conformingTo: .zip)
    }
}
