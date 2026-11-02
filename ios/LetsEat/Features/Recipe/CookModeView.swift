import SwiftUI
import UIKit

struct CookModeView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    let recipe: Recipe
    var scale: Double = 1

    @State private var stepIndex = 0
    @State private var showIngredients = false

    private var steps: [Step] {
        recipe.steps.sorted { $0.position < $1.position }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if steps.isEmpty {
                    ContentUnavailableView("No steps", systemImage: "list.number", description: Text("Add steps to this recipe to use cook mode."))
                } else {
                    TabView(selection: $stepIndex) {
                        ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                            VStack(alignment: .leading, spacing: 20) {
                                Text("Step \(index + 1) of \(steps.count)")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(LetsEatTheme.herb)
                                Text(step.body)
                                    .font(LetsEatTheme.cookStepFont)
                                    .foregroundStyle(LetsEatTheme.ink)
                                Spacer()
                            }
                            .padding(28)
                            .tag(index)
                        }
                    }
                    .tabViewStyle(.page(indexDisplayMode: .always))
                }
            }
            .background(LetsEatTheme.paper.ignoresSafeArea())
            .navigationTitle(recipe.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showIngredients = true
                    } label: {
                        Image(systemName: "carrot")
                    }
                }
                ToolbarItem(placement: .bottomBar) {
                    Button("Cooked today") {
                        recipe.cookLog.append(CookLogEntry())
                        recipe.updatedAt = Date()
                        try? modelContext.save()
                        dismiss()
                    }
                }
            }
            .sheet(isPresented: $showIngredients) {
                NavigationStack {
                    List {
                        ForEach(recipe.ingredients.sorted(by: { $0.position < $1.position })) { line in
                            Text(line.isHeading ? line.rawText : ServingScaler.display(line: line, scale: scale))
                                .font(line.isHeading ? .headline : .body)
                        }
                    }
                    .navigationTitle("Ingredients")
                    .toolbar {
                        ToolbarItem(placement: .cancellationAction) {
                            Button("Done") { showIngredients = false }
                        }
                    }
                }
                .presentationDetents([.medium, .large])
            }
            .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
            .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
        }
    }
}
