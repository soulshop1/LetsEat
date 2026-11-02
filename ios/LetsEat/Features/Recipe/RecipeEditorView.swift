import SwiftUI
import SwiftData

struct RecipeEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Bindable var recipe: Recipe

    @State private var ingredientsText: String = ""
    @State private var stepsText: String = ""
    @State private var selectedFolderName: String = ""

    @Query(sort: \Folder.position) private var folders: [Folder]

    var body: some View {
        Form {
            Section("Basics") {
                TextField("Title", text: $recipe.title)
                TextField("Description", text: $recipe.recipeDescription, axis: .vertical)
                TextField("Source name", text: $recipe.sourceName)
                TextField("Source URL", text: $recipe.sourceURL)
            }

            Section("Timing & yield") {
                TextField("Servings", value: $recipe.servings, format: .number)
                TextField("Unit", text: $recipe.servingsUnit)
                TextField("Prep minutes", value: $recipe.prepMinutes, format: .number)
                TextField("Cook minutes", value: $recipe.cookMinutes, format: .number)
            }

            Section("Ingredients (one per line)") {
                TextEditor(text: $ingredientsText)
                    .frame(minHeight: 120)
            }

            Section("Steps (blank line between steps)") {
                TextEditor(text: $stepsText)
                    .frame(minHeight: 120)
            }

            Section("Folder") {
                Picker("Folder", selection: $selectedFolderName) {
                    Text("None").tag("")
                    ForEach(folders) { folder in
                        Text(folder.name).tag(folder.name)
                    }
                }
            }

            Section("Notes") {
                TextEditor(text: $recipe.notes)
                    .frame(minHeight: 80)
            }
        }
        .navigationTitle("Edit recipe")
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
            }
        }
        .onAppear {
            ingredientsText = recipe.ingredients.sorted { $0.position < $1.position }.map(\.rawText).joined(separator: "\n")
            stepsText = recipe.steps.sorted { $0.position < $1.position }.map(\.body).joined(separator: "\n\n")
            selectedFolderName = recipe.folders.first?.name ?? ""
        }
    }

    private func save() {
        recipe.ingredients = IngredientParser.lines(from: ingredientsText)
        recipe.steps = IngredientParser.stepLines(from: stepsText)
        recipe.updatedAt = Date()

        if selectedFolderName.isEmpty {
            recipe.folders = []
        } else if let folder = folders.first(where: { $0.name == selectedFolderName }) {
            recipe.folders = [folder]
        }

        try? modelContext.save()
        dismiss()
    }
}
