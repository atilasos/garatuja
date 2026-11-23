# Fonts bundled with Garatuja

All four fonts are packaged locally through `@fontsource/*` (latin and latin-ext subsets, no CDN, no network
request at run time) and are released under the SIL Open Font License 1.1.

| Garatuja name | Family | Package | Notes |
| --- | --- | --- | --- |
| Letra de imprensa | Andika | `@fontsource/andika` | Copyright 2004-2022 SIL International. Made for early readers; also the interface font. |
| Letra manuscrita | Playwrite PT | `@fontsource/playwrite-pt` | Copyright The Playwrite Project Authors (Google). Portuguese school handwriting; the package only has the latin subset, which holds every Portuguese accent. |
| Título | Fredoka | `@fontsource/fredoka` | Copyright 2016 The Fredoka Project Authors. Used at weight 600. |
| Máquina de escrever | Courier Prime | `@fontsource/courier-prime` | Copyright 2015 The Courier Prime Project Authors. |

`stacks.ts` is the font table (ids, labels, weights, line heights) and has no CSS; `load.ts` imports the CSS and
loads the glyphs with `document.fonts.load` so canvas text never falls back while a font is still loading.
Add these names to the credits screen when it exists.
