import UIKit
import UniformTypeIdentifiers

/// Share Extension entry — accepts URLs and text, writes an ImportDraft into the App Group inbox.
final class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        Task { await processShare() }
    }

    private func processShare() async {
        defer { finish() }

        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else { return }

        var urlString: String?
        var text: String?

        for item in items {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    if let url = try? await loadURL(provider) {
                        urlString = url.absoluteString
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    if let value = try? await loadText(provider) {
                        if value.hasPrefix("http") {
                            urlString = value
                        } else {
                            text = value
                        }
                    }
                }
            }
        }

        var draft: ImportDraft
        if let urlString, let url = URL(string: urlString) {
            draft = ImportDraft.fromURL(url)
            let host = url.host?.lowercased() ?? ""
            if host.contains("instagram.com") || host.contains("tiktok.com") {
                draft.warning = "Social auto-extract is stubbed. Paste the caption into ingredients/steps after opening Let’s Eat."
            }
        } else if let text {
            draft = ImportDraft.fromPlainText(text)
        } else {
            draft = ImportDraft(title: "Shared item", warning: "Couldn’t read shared content. Try copying the link instead.")
        }

        try? ShareInbox.writePendingDraft(draft)
    }

    private func loadURL(_ provider: NSItemProvider) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { item, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let url = item as? URL {
                    continuation.resume(returning: url)
                } else if let data = item as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) {
                    continuation.resume(returning: url)
                } else {
                    continuation.resume(throwing: CocoaError(.fileReadCorruptFile))
                }
            }
        }
    }

    private func loadText(_ provider: NSItemProvider) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { item, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if let text = item as? String {
                    continuation.resume(returning: text)
                } else if let data = item as? Data, let text = String(data: data, encoding: .utf8) {
                    continuation.resume(returning: text)
                } else {
                    continuation.resume(throwing: CocoaError(.fileReadCorruptFile))
                }
            }
        }
    }

    private func finish() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
