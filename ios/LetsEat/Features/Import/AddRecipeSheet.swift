import SwiftUI

struct AddRecipeSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var urlText = ""
    @State private var plainText = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var draft: ImportDraft?

    var body: some View {
        List {
            Section {
                Text("Add a recipe")
                    .font(LetsEatTheme.headlineFont)
                    .listRowBackground(Color.clear)
            }

            Section("From the web") {
                TextField("https://…", text: $urlText)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.URL)
                    .autocorrectionDisabled()
                Button {
                    Task { await importURL() }
                } label: {
                    if isLoading {
                        ProgressView()
                    } else {
                        Label("Import URL", systemImage: "link")
                    }
                }
                .disabled(urlText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isLoading)
            }

            Section("From text") {
                TextField("Paste ingredients or a full recipe", text: $plainText, axis: .vertical)
                    .frame(minHeight: 100)
                Button {
                    draft = ImportDraft.fromPlainText(plainText)
                } label: {
                    Label("Review pasted text", systemImage: "doc.plaintext")
                }
                .disabled(plainText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }

            Section("Manual") {
                Button {
                    draft = ImportDraft(title: "")
                } label: {
                    Label("Blank recipe", systemImage: "square.and.pencil")
                }
            }

            Section {
                Text("Instagram / TikTok auto-extract is stubbed in MVP. Share a link into the extension, then paste the caption into the review screen.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            if let errorMessage {
                Section {
                    Text(errorMessage)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Add")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Close") { dismiss() }
            }
        }
        .navigationDestination(item: $draft) { value in
            ImportReviewView(draft: value) {
                draft = nil
                dismiss()
            }
        }
    }

    private func importURL() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            draft = try await URLRecipeImporter.importDraft(from: urlText)
        } catch URLRecipeImporter.ImportError.unsupportedSocial {
            var social = ImportDraft.fromURL(URL(string: urlText) ?? URL(string: "https://example.com")!)
            social.warning = URLRecipeImporter.ImportError.unsupportedSocial.errorDescription
            draft = social
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
