import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct SettingsView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var exportURL: URL?
    @State private var showExporter = false
    @State private var showImporter = false
    @State private var statusMessage: String?
    @State private var exportData: Data?

    var body: some View {
        NavigationStack {
            List {
                Section("Let’s Eat") {
                    LabeledContent("Product", value: "Personal recipe box")
                    LabeledContent("Storage", value: "SwiftData · on device")
                    Text("Inspired by apps like Osta — original branding and UI.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Backup") {
                    Button {
                        exportLibrary()
                    } label: {
                        Label("Export library zip", systemImage: "square.and.arrow.up")
                    }

                    Button {
                        showImporter = true
                    } label: {
                        Label("Import Let’s Eat zip", systemImage: "square.and.arrow.down")
                    }
                }

                if let statusMessage {
                    Section {
                        Text(statusMessage)
                            .font(.footnote)
                    }
                }

                Section("MVP stubs") {
                    Text("Instagram / TikTok scrape, OCR scan, CloudKit sharing, and live grocery are intentionally stubbed or deferred.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("You")
            .fileExporter(
                isPresented: $showExporter,
                document: ZipDocument(data: exportData ?? Data()),
                contentType: .zip,
                defaultFilename: "lets-eat-export-\(dateStamp())"
            ) { result in
                switch result {
                case .success:
                    statusMessage = "Export saved."
                case .failure(let error):
                    statusMessage = error.localizedDescription
                }
            }
            .fileImporter(
                isPresented: $showImporter,
                allowedContentTypes: [.zip, .json],
                allowsMultipleSelection: false
            ) { result in
                importLibrary(result: result)
            }
        }
    }

    private func exportLibrary() {
        do {
            exportData = try LibraryBackup.exportZip(context: modelContext)
            showExporter = true
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func importLibrary(result: Result<[URL], Error>) {
        do {
            guard let url = try result.get().first else { return }
            let accessing = url.startAccessingSecurityScopedResource()
            defer { if accessing { url.stopAccessingSecurityScopedResource() } }
            let data = try Data(contentsOf: url)
            if url.pathExtension.lowercased() == "json" {
                // Wrap bare recipes.json into a zip-compatible import by synthesizing entries.
                let entries = [MinimalZip.Entry(path: "recipes.json", data: data)]
                let zip = MinimalZip.create(entries: entries)
                let count = try LibraryBackup.importZip(data: zip, context: modelContext)
                statusMessage = "Imported \(count) recipe\(count == 1 ? "" : "s")."
            } else {
                let count = try LibraryBackup.importZip(data: data, context: modelContext)
                statusMessage = "Imported \(count) recipe\(count == 1 ? "" : "s")."
            }
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    private func dateStamp() -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }
}

struct ZipDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.zip] }
    var data: Data

    init(data: Data) {
        self.data = data
    }

    init(configuration: ReadConfiguration) throws {
        self.data = configuration.file.regularFileContents ?? Data()
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}
