# Let’s Eat — Native iOS (SwiftUI)

Osta-inspired personal recipe box. Local-first SwiftData, Share Extension imports, cook mode, zip backup.

## Open in Xcode

1. On a Mac with **Xcode 15+** (iOS 17 SDK):
2. Open `ios/LetsEat.xcodeproj`
3. Select the **LetsEat** scheme → iPhone simulator or device
4. Update the **Team** signing for both `LetsEat` and `LetsEatShare` targets
5. App Group `group.com.letseat.app` is declared for Share Extension handoff — enable it on your Team if prompted
6. Build & Run (`⌘R`)

> This repo was scaffolded on Linux; **compilation requires macOS + Xcode**.

## What’s in MVP

| Area | Status |
|---|---|
| Tab shell (Box / Search / Add / Grocery / You) | Real navigation |
| SwiftData models (Recipe, folders, ingredients, steps, photos, grocery stubs) | Real |
| Box home + folders + recent saves | Real UI, sample seed data |
| Recipe detail + editor + cook mode (wake lock) | Real structure |
| Import sheet (URL / text / manual) + review-before-save | Real flow; HTML extract is best-effort JSON-LD |
| Share Extension | Real target; writes pending import into App Group |
| Instagram / TikTok scrape | **Stubbed** — falls through to manual/text review |
| Zip backup + Let’s Eat web export import | Real JSON/zip helpers (Compression / minimal zip) |
| Grocery / CloudKit sharing | Placeholder screens (post-MVP) |

## Bundle IDs

- App: `com.letseat.app`
- Share Extension: `com.letseat.app.share`
- App Group: `group.com.letseat.app`
