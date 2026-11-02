import Foundation

/// App Group mailbox between the Share Extension and the main app.
enum ShareInbox {
    static func writePendingDraft(_ draft: ImportDraft) throws {
        guard let url = AppConstants.pendingImportURL else {
            throw CocoaError(.fileNoSuchFile)
        }
        let data = try JSONEncoder().encode(draft)
        try data.write(to: url, options: .atomic)
    }

    static func consumePendingDraft() -> ImportDraft? {
        guard let url = AppConstants.pendingImportURL,
              FileManager.default.fileExists(atPath: url.path),
              let data = try? Data(contentsOf: url),
              let draft = try? JSONDecoder().decode(ImportDraft.self, from: data)
        else { return nil }
        try? FileManager.default.removeItem(at: url)
        return draft
    }
}
