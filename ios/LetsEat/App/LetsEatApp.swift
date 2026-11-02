import SwiftUI
import SwiftData

@main
struct LetsEatApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Recipe.self,
            IngredientLine.self,
            Step.self,
            RecipePhoto.self,
            Tag.self,
            Folder.self,
            CookLogEntry.self,
            GroceryList.self,
            GroceryItem.self
        ])
        let config = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            groupContainer: .identifier(AppConstants.appGroupID)
        )
        do {
            return try ModelContainer(for: schema, configurations: [config])
        } catch {
            // Fall back to on-device only if App Group is unavailable in simulator/unsigned builds.
            let fallback = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
            do {
                return try ModelContainer(for: schema, configurations: [fallback])
            } catch {
                fatalError("Could not create ModelContainer: \(error)")
            }
        }
    }()

    var body: some Scene {
        WindowGroup {
            RootView()
                .tint(LetsEatTheme.accent)
        }
        .modelContainer(sharedModelContainer)
    }
}
