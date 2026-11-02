import Foundation

/// Fetches a page and extracts schema.org/Recipe JSON-LD when present.
/// Social scrapes (Instagram / TikTok) are explicitly stubbed for MVP.
enum URLRecipeImporter {
    enum ImportError: LocalizedError {
        case invalidURL
        case privateHost
        case fetchFailed(String)
        case unsupportedSocial

        var errorDescription: String? {
            switch self {
            case .invalidURL: return "That doesn’t look like a valid URL."
            case .privateHost: return "Private-network URLs can’t be imported."
            case .fetchFailed(let message): return message
            case .unsupportedSocial:
                return "Instagram/TikTok auto-extract is stubbed in MVP. Paste the caption or recipe text instead."
            }
        }
    }

    static func importDraft(from rawURL: String) async throws -> ImportDraft {
        guard let url = URL(string: rawURL.trimmingCharacters(in: .whitespacesAndNewlines)),
              let scheme = url.scheme?.lowercased(),
              scheme == "http" || scheme == "https"
        else { throw ImportError.invalidURL }

        if isPrivateHost(url.host ?? "") {
            throw ImportError.privateHost
        }

        if isSocialHost(url.host ?? "") {
            var draft = ImportDraft.fromURL(url)
            draft.warning = ImportError.unsupportedSocial.errorDescription
            draft.notes = "Paste caption / comments into ingredients & steps."
            throw ImportError.unsupportedSocial
        }

        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw ImportError.fetchFailed("The site didn’t return a usable page.")
        }
        if data.count > 3_000_000 {
            throw ImportError.fetchFailed("Page is too large to import.")
        }

        let html = String(decoding: data, as: UTF8.self)
        if let extracted = extractJSONLDRecipe(from: html) {
            return extracted.withSource(url: url)
        }

        var draft = ImportDraft.fromURL(url)
        if let title = matchMeta(html, property: "og:title") ?? matchTitleTag(html) {
            draft.title = title
        }
        draft.warning = "No schema.org/Recipe markup found. Fill in the fields manually."
        return draft
    }

    // MARK: - JSON-LD

    private static func extractJSONLDRecipe(from html: String) -> ImportDraft? {
        let pattern = #"<script[^>]*type=["']application/ld\+json["'][^>]*>(.*?)</script>"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators]) else {
            return nil
        }
        let range = NSRange(html.startIndex..<html.endIndex, in: html)
        let matches = regex.matches(in: html, options: [], range: range)

        for match in matches {
            guard let bodyRange = Range(match.range(at: 1), in: html) else { continue }
            let jsonText = String(html[bodyRange])
            guard let data = jsonText.data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: data) else { continue }
            if let draft = draftFromJSONLD(obj) { return draft }
        }
        return nil
    }

    private static func draftFromJSONLD(_ obj: Any) -> ImportDraft? {
        if let dict = obj as? [String: Any] {
            if let type = dict["@type"] as? String, type.lowercased().contains("recipe") {
                return mapRecipeDict(dict)
            }
            if let types = dict["@type"] as? [String], types.contains(where: { $0.lowercased().contains("recipe") }) {
                return mapRecipeDict(dict)
            }
            if let graph = dict["@graph"] as? [Any] {
                for node in graph {
                    if let draft = draftFromJSONLD(node) { return draft }
                }
            }
        }
        if let array = obj as? [Any] {
            for node in array {
                if let draft = draftFromJSONLD(node) { return draft }
            }
        }
        return nil
    }

    private static func mapRecipeDict(_ dict: [String: Any]) -> ImportDraft {
        let ingredients: [String]
        if let list = dict["recipeIngredient"] as? [String] {
            ingredients = list
        } else {
            ingredients = []
        }

        let steps: [String]
        if let instructions = dict["recipeInstructions"] as? [String] {
            steps = instructions
        } else if let instructions = dict["recipeInstructions"] as? [[String: Any]] {
            steps = instructions.compactMap { $0["text"] as? String }
        } else if let text = dict["recipeInstructions"] as? String {
            steps = [text]
        } else {
            steps = []
        }

        let yield = dict["recipeYield"]
        let servings: Double?
        if let number = yield as? Double {
            servings = number
        } else if let number = yield as? Int {
            servings = Double(number)
        } else if let text = yield as? String {
            servings = Double(text.split(separator: " ").first.flatMap { Double($0) } ?? 0)
        } else {
            servings = nil
        }

        return ImportDraft(
            title: dict["name"] as? String ?? "Imported recipe",
            recipeDescription: dict["description"] as? String ?? "",
            servings: servings == 0 ? nil : servings,
            prepMinutes: durationMinutes(dict["prepTime"]),
            cookMinutes: durationMinutes(dict["cookTime"]),
            ingredientsText: ingredients.joined(separator: "\n"),
            stepsText: steps.joined(separator: "\n\n"),
            sourceName: (dict["author"] as? [String: Any])?["name"] as? String
                ?? (dict["author"] as? String)
                ?? ""
        )
    }

    private static func durationMinutes(_ value: Any?) -> Int? {
        guard let text = value as? String else { return nil }
        // ISO-8601 duration like PT15M / PT1H30M
        var total = 0
        let pattern = #"PT(?:(\d+)H)?(?:(\d+)M)?"#
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..<text.endIndex, in: text))
        else { return nil }
        if let h = Range(match.range(at: 1), in: text), let hours = Int(text[h]) { total += hours * 60 }
        if let m = Range(match.range(at: 2), in: text), let mins = Int(text[m]) { total += mins }
        return total == 0 ? nil : total
    }

    // MARK: - Helpers

    private static func isSocialHost(_ host: String) -> Bool {
        let h = host.lowercased()
        return h.contains("instagram.com") || h.contains("tiktok.com") || h.contains("vm.tiktok.com")
    }

    private static func isPrivateHost(_ host: String) -> Bool {
        let h = host.lowercased()
        if h == "localhost" || h.hasSuffix(".local") || h.hasSuffix(".internal") { return true }
        if h.hasPrefix("127.") || h.hasPrefix("10.") || h.hasPrefix("192.168.") || h.hasPrefix("169.254.") {
            return true
        }
        return false
    }

    private static func matchMeta(_ html: String, property: String) -> String? {
        let pattern = #"property=["']\#(property)["'][^>]*content=["']([^"']+)["']"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
              let match = regex.firstMatch(in: html, range: NSRange(html.startIndex..<html.endIndex, in: html)),
              let range = Range(match.range(at: 1), in: html)
        else { return nil }
        return String(html[range])
    }

    private static func matchTitleTag(_ html: String) -> String? {
        let pattern = #"<title[^>]*>(.*?)</title>"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive, .dotMatchesLineSeparators]),
              let match = regex.firstMatch(in: html, range: NSRange(html.startIndex..<html.endIndex, in: html)),
              let range = Range(match.range(at: 1), in: html)
        else { return nil }
        return String(html[range]).trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

private extension ImportDraft {
    func withSource(url: URL) -> ImportDraft {
        var copy = self
        copy.sourceURL = url.absoluteString
        if copy.sourceName.isEmpty { copy.sourceName = url.host ?? "" }
        return copy
    }
}
