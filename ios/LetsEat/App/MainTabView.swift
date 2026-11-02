import SwiftUI

enum AppTab: Hashable {
    case box, search, add, grocery, you
}

struct MainTabView: View {
    @State private var tab: AppTab = .box
    @State private var showAddSheet = false

    var body: some View {
        TabView(selection: $tab) {
            BoxHomeView()
                .tabItem { Label("Box", systemImage: "square.stack.fill") }
                .tag(AppTab.box)

            SearchView()
                .tabItem { Label("Search", systemImage: "magnifyingglass") }
                .tag(AppTab.search)

            Color.clear
                .tabItem { Label("Add", systemImage: "plus.circle.fill") }
                .tag(AppTab.add)

            GroceryPlaceholderView()
                .tabItem { Label("Grocery", systemImage: "cart") }
                .tag(AppTab.grocery)

            SettingsView()
                .tabItem { Label("You", systemImage: "person.crop.circle") }
                .tag(AppTab.you)
        }
        .onChange(of: tab) { _, newValue in
            if newValue == .add {
                showAddSheet = true
                tab = .box
            }
        }
        .sheet(isPresented: $showAddSheet) {
            NavigationStack {
                AddRecipeSheet()
            }
        }
    }
}
