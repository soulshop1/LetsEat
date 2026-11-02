import Foundation

/// Best-effort parse of an ingredient line. Raw text is always preserved separately.
enum IngredientParser {
    static func parse(_ raw: String) -> (qty: Double?, unit: String?, item: String?, isHeading: Bool) {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasPrefix("#") || trimmed.hasSuffix(":") {
            let heading = trimmed.trimmingCharacters(in: CharacterSet(charactersIn: "#")).trimmingCharacters(in: .whitespaces)
            return (nil, nil, heading, true)
        }

        let units = ["cups", "cup", "tbsp", "tsp", "oz", "lb", "g", "kg", "ml", "l", "cloves", "clove"]
        let parts = trimmed.split(separator: " ", maxSplits: 3, omittingEmptySubsequences: true).map(String.init)
        guard let first = parts.first, let qty = parseQuantity(first) else {
            return (nil, nil, trimmed, false)
        }

        if parts.count >= 2, units.contains(parts[1].lowercased()) {
            let item = parts.dropFirst(2).joined(separator: " ")
            return (qty, parts[1], item.isEmpty ? nil : item, false)
        }

        let item = parts.dropFirst().joined(separator: " ")
        return (qty, nil, item.isEmpty ? nil : item, false)
    }

    static func lines(from text: String) -> [IngredientLine] {
        text
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .enumerated()
            .map { index, raw in
                let parsed = parse(raw)
                return IngredientLine(
                    position: index,
                    rawText: raw,
                    qty: parsed.qty,
                    unit: parsed.unit,
                    item: parsed.item,
                    isHeading: parsed.isHeading
                )
            }
    }

    static func stepLines(from text: String) -> [Step] {
        text
            .components(separatedBy: "\n\n")
            .flatMap { $0.components(separatedBy: .newlines) }
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
            .enumerated()
            .map { Step(position: $0.offset, body: $0.element) }
    }

    private static func parseQuantity(_ token: String) -> Double? {
        if let value = Double(token) { return value }
        let fractions: [String: Double] = [
            "½": 0.5, "⅓": 1.0 / 3, "⅔": 2.0 / 3, "¼": 0.25, "¾": 0.75,
            "1/2": 0.5, "1/3": 1.0 / 3, "2/3": 2.0 / 3, "1/4": 0.25, "3/4": 0.75
        ]
        if let value = fractions[token] { return value }
        let mixed = token.split(separator: " ", maxSplits: 1).map(String.init)
        if mixed.count == 2, let whole = Double(mixed[0]), let frac = fractions[mixed[1]] {
            return whole + frac
        }
        return nil
    }
}

enum ServingScaler {
    static func display(line: IngredientLine, scale: Double) -> String {
        guard let qty = line.qty, scale != 1 else { return line.rawText }
        let scaled = qty * scale
        let qtyText = formatQuantity(scaled)
        if let unit = line.unit, let item = line.item {
            return "\(qtyText) \(unit) \(item)"
        }
        if let item = line.item {
            return "\(qtyText) \(item)"
        }
        return "\(qtyText) · \(line.rawText)"
    }

    private static func formatQuantity(_ value: Double) -> String {
        let rounded = (value * 100).rounded() / 100
        if abs(rounded - rounded.rounded()) < 0.001 {
            return String(Int(rounded.rounded()))
        }
        return String(format: "%g", rounded)
    }
}
