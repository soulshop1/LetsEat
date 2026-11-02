import SwiftUI

/// Post-MVP surface — kept in the tab bar so IA matches the plan.
struct GroceryPlaceholderView: View {
    var body: some View {
        NavigationStack {
            ContentUnavailableView {
                Label("Grocery lists", systemImage: "cart")
            } description: {
                Text("Consolidate ingredients from recipes and share lists with your household — coming after MVP.")
            }
            .navigationTitle("Grocery")
        }
    }
}
