import Foundation

/// Editable payload shown on the review-before-save screen.
struct ImportDraft: Identifiable, Codable, Hashable {
    var id: UUID
    var title: String
    var recipeDescription: String
    var servings: Double?
    var servingsUnit: String
    var prepMinutes: Int?
    var cookMinutes: Int?
    var ingredientsText: String
    var stepsText: String
    var notes: String
    var sourceName: String
    var sourceURL: String
    var folderName: String?
    var warning: String?

    init(
        id: UUID = UUID(),
        title: String = "",
        recipeDescription: String = "",
        servings: Double? = nil,
        servingsUnit: String = "servings",
        prepMinutes: Int? = nil,
        cookMinutes: Int? = nil,
        ingredientsText: String = "",
        stepsText: String = "",
        notes: String = "",
        sourceName: String = "",
        sourceURL: String = "",
        folderName: String? = nil,
        warning: String? = nil
    ) {
        self.id = id
        self.title = title
        self.recipeDescription = recipeDescription
        self.servings = servings
        self.servingsUnit = servingsUnit
        self.prepMinutes = prepMinutes
        self.cookMinutes = cookMinutes
        self.ingredientsText = ingredientsText
        self.stepsText = stepsText
        self.notes = notes
        self.sourceName = sourceName
        self.sourceURL = sourceURL
        self.folderName = folderName
        self.warning = warning
    }

    static func fromURL(_ url: URL) -> ImportDraft {
        ImportDraft(
            title: url.host ?? "Imported recipe",
            sourceName: url.host ?? "",
            sourceURL: url.absoluteString
        )
    }

    static func fromPlainText(_ text: String, sourceURL: String = "") -> ImportDraft {
        ImportDraft(
            title: "Pasted recipe",
            ingredientsText: text,
            sourceURL: sourceURL,
            warning: "Review and split ingredients vs steps before saving."
        )
    }
}
