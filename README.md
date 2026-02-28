# VocabApp (iOS 17+)

Native SwiftUI app to remember English words using spaced repetition (Again / Hard / Good / Easy).

## What’s included
- SwiftUI screens: Home, Review, Browse/Search, Add/Edit, Settings
- SwiftData persistence (`Word` model)
- Simplified SM-2 style scheduling (`SRSService`)
- Daily local notification reminder (optional)
- JSON import/export for backup

## Open in Xcode
This repo contains the app source files (no `.xcodeproj` was generated here).

In Xcode on macOS:
1. Create a new **iOS App** (SwiftUI) project named `VocabApp` targeting **iOS 17+**.
2. Replace the generated `ContentView.swift`/`App` entry with the files in this folder (or drag `VocabApp/` into the project).
3. Ensure **SwiftData** is enabled (iOS 17+).
4. (Optional) Add `VocabAppTests/SRSTests.swift` to a test target named `VocabAppTests`.

