import SwiftUI
import SwiftData
import UIKit

struct RecipeDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Bindable var recipe: Recipe
    @State private var scale: Double = 1
    @State private var showCook = false
    @State private var showEdit = false

    private var baseServings: Double { recipe.servings ?? 1 }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                hero
                meta
                scaler
                ingredients
                steps
                if !recipe.notes.isEmpty {
                    notes
                }
            }
            .padding()
        }
        .background(LetsEatTheme.paper.ignoresSafeArea())
        .navigationTitle(recipe.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                Button {
                    recipe.isFavorite.toggle()
                    recipe.updatedAt = Date()
                } label: {
                    Image(systemName: recipe.isFavorite ? "heart.fill" : "heart")
                        .foregroundStyle(LetsEatTheme.coral)
                }
                Button("Edit") { showEdit = true }
            }
        }
        .safeAreaInset(edge: .bottom) {
            Button {
                showCook = true
            } label: {
                Text("Cook")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(LetsEatTheme.herb, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .foregroundStyle(.white)
            }
            .padding()
            .background(.ultraThinMaterial)
        }
        .fullScreenCover(isPresented: $showCook) {
            CookModeView(recipe: recipe, scale: scale)
        }
        .sheet(isPresented: $showEdit) {
            NavigationStack {
                RecipeEditorView(recipe: recipe)
            }
        }
    }

    private var hero: some View {
        RoundedRectangle(cornerRadius: 24, style: .continuous)
            .fill(LetsEatTheme.mist)
            .frame(height: 220)
            .overlay {
                if let data = recipe.coverPhoto?.imageData, let uiImage = UIImage(data: data) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFill()
                        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                } else {
                    Image(systemName: "fork.knife.circle")
                        .font(.system(size: 56, weight: .ultraLight))
                        .foregroundStyle(LetsEatTheme.herb.opacity(0.6))
                }
            }
            .clipped()
    }

    private var meta: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(recipe.title)
                .font(LetsEatTheme.titleFont)
            if !recipe.recipeDescription.isEmpty {
                Text(recipe.recipeDescription)
                    .foregroundStyle(.secondary)
            }
            HStack(spacing: 12) {
                if let total = recipe.totalMinutes {
                    Label("\(total) min", systemImage: "clock")
                }
                if let servings = recipe.servings {
                    Label("\(format(servings)) \(recipe.servingsUnit)", systemImage: "person.2")
                }
                if !recipe.sourceName.isEmpty {
                    Label(recipe.sourceName, systemImage: "link")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
    }

    private var scaler: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Servings")
                .font(.headline)
            Stepper(
                value: $scale,
                in: 0.5...4,
                step: 0.5
            ) {
                Text("\(format(baseServings * scale)) \(recipe.servingsUnit)")
            }
        }
    }

    private var ingredients: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Ingredients")
                .font(.headline)
            ForEach(recipe.ingredients.sorted(by: { $0.position < $1.position })) { line in
                if line.isHeading {
                    Text(line.rawText)
                        .font(.subheadline.weight(.semibold))
                        .padding(.top, 6)
                } else {
                    Text(ServingScaler.display(line: line, scale: scale))
                        .font(LetsEatTheme.bodyFont)
                }
            }
        }
    }

    private var steps: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Steps")
                .font(.headline)
            ForEach(Array(recipe.steps.sorted(by: { $0.position < $1.position }).enumerated()), id: \.element.id) { index, step in
                HStack(alignment: .top, spacing: 12) {
                    Text("\(index + 1)")
                        .font(.headline)
                        .foregroundStyle(LetsEatTheme.herb)
                        .frame(width: 28)
                    Text(step.body)
                }
            }
        }
    }

    private var notes: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Notes")
                .font(.headline)
            Text(recipe.notes)
                .foregroundStyle(.secondary)
        }
    }

    private func format(_ value: Double) -> String {
        abs(value - value.rounded()) < 0.001 ? String(Int(value.rounded())) : String(format: "%g", value)
    }
}
