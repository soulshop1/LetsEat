import Foundation

enum AppConstants {
    static let appGroupID = "group.com.letseat.app"
    static let pendingImportFilename = "pending-import.json"
    static let exportFormatVersion = 1
    static let appName = "Let’s Eat"

    static var sharedContainerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupID)
    }

    static var pendingImportURL: URL? {
        sharedContainerURL?.appendingPathComponent(pendingImportFilename)
    }
}
