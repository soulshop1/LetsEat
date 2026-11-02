import SwiftUI
import SwiftData

struct SearchView: View {
    @Query(sort: \Recipe.updatedAt, order: .reverse) private var recipes: [Recipe]
    @State private var query = ""
    @State private var favoritesOnly = false

    private var filtered: [Recipe] {
        recipes.filter { recipe in
            if favoritesOnly && !recipe.isFavorite { return false }
            let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !q.isEmpty else { return true }
            let haystack = [
                recipe.title,
                recipe.recipeDescription,
                recipe.notes,
                recipe.ingredients.map(\.rawText).joined(separator: " "),
                recipe.steps.map(\.body).joined(separator: " "),
                recipe.tags.map(\.name).joined(separator: " ")
            ].joined(separator: "\n").lowercased()
            return haystack.contains(q.lowercased())
        }
    }

    var body: some View {
        NavigationStack {
            List {
                Toggle("Favorites only", isOn: $favoritesOnly)
                ForEach(filtered) { recipe in
                    NavigationLink {
                        RecipeDetailView(recipe: recipe)
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(recipe.title).font(.headline)
                            if let minutes = recipe.totalMinutes {
                                Text("\(minutes) min").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Search")
            .searchable(text: $query, prompt: "Ingredients, titles, notes")
        }
    }
}
