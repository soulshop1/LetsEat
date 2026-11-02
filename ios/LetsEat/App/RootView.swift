import SwiftUI
import SwiftData
import UIKit

/// Boots the tab shell and drains any Share Extension pending import.
struct RootView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var pendingDraft: ImportDraft?
    @State private var didSeed = false

    var body: some View {
        MainTabView()
            .sheet(item: $pendingDraft) { draft in
                NavigationStack {
                    ImportReviewView(draft: draft) {
                        pendingDraft = nil
                    }
                }
            }
            .task {
                seedIfNeeded()
                consumeShareExtensionImport()
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
                consumeShareExtensionImport()
            }
    }

    private func seedIfNeeded() {
        guard !didSeed else { return }
        didSeed = true
        SampleData.seedIfEmpty(context: modelContext)
    }

    private func consumeShareExtensionImport() {
        guard let draft = ShareInbox.consumePendingDraft() else { return }
        pendingDraft = draft
    }
}
