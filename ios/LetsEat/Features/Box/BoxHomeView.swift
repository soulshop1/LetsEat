import SwiftUI
import SwiftData
import UIKit

struct BoxHomeView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Folder.position) private var folders: [Folder]
    @Query(sort: \Recipe.updatedAt, order: .reverse) private var recipes: [Recipe]

    @State private var clipboardURL: URL?
    @State private var pasteDraft: ImportDraft?
    @State private var showNewFolder = false
    @State private var newFolderName = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header

                    if let clipboardURL {
                        clipboardBanner(clipboardURL)
                    }

                    foldersSection
                    recentSection
                }
                .padding()
            }
            .background(LetsEatTheme.paper.ignoresSafeArea())
            .navigationTitle(AppConstants.appName)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showNewFolder = true
                    } label: {
                        Image(systemName: "folder.badge.plus")
                    }
                }
            }
            .task { refreshClipboard() }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
                refreshClipboard()
            }
            .alert("New folder", isPresented: $showNewFolder) {
                TextField("Name", text: $newFolderName)
                Button("Create") { createFolder() }
                Button("Cancel", role: .cancel) { newFolderName = "" }
            }
            .sheet(item: $pasteDraft) { draft in
                NavigationStack {
                    ImportReviewView(draft: draft) { pasteDraft = nil }
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Your recipe box")
                .font(LetsEatTheme.headlineFont)
                .foregroundStyle(LetsEatTheme.ink)
            Text("Save from anywhere. Cook without clutter.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    private func clipboardBanner(_ url: URL) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Link ready to import")
                    .font(.subheadline.weight(.semibold))
                Text(url.absoluteString)
                    .font(.caption)
                    .lineLimit(1)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Paste") {
                Task { await importClipboard(url) }
            }
            .buttonStyle(.borderedProminent)
            .tint(LetsEatTheme.herb)
        }
        .padding()
        .background(.white.opacity(0.8), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var foldersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Folders")
                .font(.headline)

            if folders.isEmpty {
                Text("Create a folder to organize weeknight dinners, baking, and more.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                    ForEach(folders) { folder in
                        NavigationLink {
                            FolderDetailView(folder: folder)
                        } label: {
                            FolderCoverView(name: folder.name, count: folder.recipes.count)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recently saved")
                .font(.headline)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                ForEach(recipes.prefix(8)) { recipe in
                    NavigationLink {
                        RecipeDetailView(recipe: recipe)
                    } label: {
                        RecipeCardView(
                            title: recipe.title,
                            subtitle: recipe.totalMinutes.map { "\($0) min" },
                            isFavorite: recipe.isFavorite
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func refreshClipboard() {
        if UIPasteboard.general.hasURLs, let url = UIPasteboard.general.url {
            clipboardURL = url
        } else if let str = UIPasteboard.general.string,
                  let url = URL(string: str),
                  url.scheme == "http" || url.scheme == "https" {
            clipboardURL = url
        } else {
            clipboardURL = nil
        }
    }

    private func importClipboard(_ url: URL) async {
        do {
            pasteDraft = try await URLRecipeImporter.importDraft(from: url.absoluteString)
        } catch URLRecipeImporter.ImportError.unsupportedSocial {
            var draft = ImportDraft.fromURL(url)
            draft.warning = URLRecipeImporter.ImportError.unsupportedSocial.errorDescription
            pasteDraft = draft
        } catch {
            var draft = ImportDraft.fromURL(url)
            draft.warning = error.localizedDescription
            pasteDraft = draft
        }
        clipboardURL = nil
    }

    private func createFolder() {
        let name = newFolderName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        modelContext.insert(Folder(name: name, position: folders.count))
        try? modelContext.save()
        newFolderName = ""
    }
}

struct FolderDetailView: View {
    @Bindable var folder: Folder

    var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
                ForEach(folder.recipes.sorted(by: { $0.updatedAt > $1.updatedAt })) { recipe in
                    NavigationLink {
                        RecipeDetailView(recipe: recipe)
                    } label: {
                        RecipeCardView(title: recipe.title, isFavorite: recipe.isFavorite)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding()
        }
        .background(LetsEatTheme.paper.ignoresSafeArea())
        .navigationTitle(folder.name)
    }
}
