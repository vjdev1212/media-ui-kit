# media-ui-kit

Shared React Native UI components for Strmify and EmbedIn.

## Local development

Keep this repository alongside the app repositories:

```text
Repositories/
  media-ui-kit/
  strmify/
  embedin/
```

Each app installs the package from the sibling directory:

```bash
npm install @vjdev1212/media-ui-kit@file:../media-ui-kit
```

The package intentionally exposes TypeScript source so edits can be tested
directly in the consuming Expo app without building or publishing it.

## Components

- `BottomSpacing`
- `BlurGradientBackground`
- `ContextMenu`
- `MediaCastAndCrews`
- `MediaContentDescription`
- `MediaContentDetailsList`
- `MediaContentHeader`
- `MediaContentPoster`
- `MediaLogo`
- `LibraryButton`
- `MediaGrid`
- `NativeFieldSelect`
- `ExternalLink`
- `PosterCarousel`
- `SeasonEpisodeList`
- `SettingsPage`, `SettingsRow`, `SettingsSection`, `SettingsTitle`
- `MonoText`
- `PersonBiography`
- `PersonDetailsCloseButton`
- `PersonDetailsContent`
- `PersonDetailsSheet`
- `PlayButton`
- `PosterList`
- `PosterArtwork`
- `WatchTrailerButton`
- `WebMenu`

The package also exports Strmify's shared dark theme, themed primitives, and
`NativeButton` for building consistent components.
Shared utility hooks `useColorScheme` and `useClientOnlyValue` are available
from the package entry point as well.

Apps import shared components directly from `@vjdev1212/media-ui-kit`.
Components that need app-specific behavior, such as route navigation, receive
callbacks; the app screens remain responsible for routing and data services.

React and React Native are peer dependencies and are provided by the consuming
app.
