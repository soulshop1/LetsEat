import SwiftUI
import SwiftData

struct ImportReviewView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @State private var draft: ImportDraft
    var onFinished: () -> Void

    @Query(sort: \Folder.position) private var folders: [Folder]
    @State private var saveError: String?

    init(draft: ImportDraft, onFinished: @escaping () -> Void) {
        _draft = State(initialValue: draft)
        self.onFinished = onFinished
    }

    var body: some View {
        Form {
            if let warning = draft.warning {
                Section {
                    Label(warning, systemImage: "exclamationmark.triangle")
                        .foregroundStyle(.orange)
                        .font(.subheadline)
                }
            }

            Section("Recipe") {
                TextField("Title", text: $draft.title)
                TextField("Description", text: $draft.recipeDescription, axis: .vertical)
                TextField("Source name", text: $draft.sourceName)
                TextField("Source URL", text: $draft.sourceURL)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
            }

            Section("Yield & time") {
                TextField("Servings", value: $draft.servings, format: .number)
                TextField("Unit", text: $draft.servingsUnit)
                TextField("Prep min", value: $draft.prepMinutes, format: .number)
                TextField("Cook min", value: $draft.cookMinutes, format: .number)
            }

            Section("Ingredients (one per line)") {
                TextEditor(text: $draft.ingredientsText)
                    .frame(minHeight: 140)
            }

            Section("Steps") {
                TextEditor(text: $draft.stepsText)
                    .frame(minHeight: 140)
            }

            Section("Save into folder") {
                Picker("Folder", selection: Binding(
                    get: { draft.folderName ?? "" },
                    set: { draft.folderName = $0.isEmpty ? nil : $0 }
                )) {
                    Text("None").tag("")
                    ForEach(folders) { folder in
                        Text(folder.name).tag(folder.name)
                    }
                }
                TextField("Or new folder name", text: Binding(
                    get: { draft.folderName ?? "" },
                    set: { draft.folderName = $0 }
                ))
            }

            Section("Notes") {
                TextEditor(text: $draft.notes)
                    .frame(minHeight: 60)
            }

            if let saveError {
                Section {
                    Text(saveError).foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Review import")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Cancel") {
                    onFinished()
                    dismiss()
                }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") { save() }
                    .disabled(draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                              && draft.ingredientsText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
    }

    private func save() {
        do {
            _ = try RecipeFactory.save(draft: draft, context: modelContext)
            onFinished()
            dismiss()
        } catch {
            saveError = error.localizedDescription
        }
    }
}
