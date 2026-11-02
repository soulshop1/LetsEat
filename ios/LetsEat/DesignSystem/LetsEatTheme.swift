import SwiftUI

/// Original Let’s Eat visual tokens — not an Osta clone.
enum LetsEatTheme {
    static let accent = Color("AccentColor")
    static let paper = Color(red: 0.97, green: 0.96, blue: 0.93)
    static let ink = Color(red: 0.14, green: 0.16, blue: 0.14)
    static let mist = Color(red: 0.90, green: 0.92, blue: 0.89)
    static let herb = Color(red: 0.22, green: 0.45, blue: 0.36)
    static let coral = Color(red: 0.86, green: 0.42, blue: 0.32)

    static let titleFont = Font.system(.largeTitle, design: .serif).weight(.semibold)
    static let headlineFont = Font.system(.title2, design: .serif).weight(.semibold)
    static let bodyFont = Font.system(.body, design: .default)
    static let cookStepFont = Font.system(size: 28, weight: .medium, design: .serif)
}

struct RecipeCardView: View {
    let title: String
    var subtitle: String? = nil
    var isFavorite: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ZStack(alignment: .topTrailing) {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [LetsEatTheme.mist, LetsEatTheme.paper],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(height: 140)
                    .overlay {
                        Image(systemName: "fork.knife")
                            .font(.system(size: 36, weight: .light))
                            .foregroundStyle(LetsEatTheme.herb.opacity(0.55))
                    }

                if isFavorite {
                    Image(systemName: "heart.fill")
                        .foregroundStyle(LetsEatTheme.coral)
                        .padding(10)
                }
            }

            Text(title)
                .font(.headline)
                .foregroundStyle(LetsEatTheme.ink)
                .lineLimit(2)

            if let subtitle {
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct FolderCoverView: View {
    let name: String
    let count: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(LetsEatTheme.herb.gradient)
                .frame(height: 110)
                .overlay(alignment: .bottomLeading) {
                    Text(name)
                        .font(LetsEatTheme.headlineFont)
                        .foregroundStyle(.white)
                        .padding(14)
                }

            Text("\(count) recipe\(count == 1 ? "" : "s")")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
