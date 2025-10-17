Refactor Stage 1 (general_preview-scope)

All new assets were placed STRICTLY under general_preview/:
- general_preview/assets/styles/normalize.css
- general_preview/assets/styles/base.css
- general_preview/assets/styles/mobile.css
- general_preview/assets/styles/overrides.css
- general_preview/assets/mobile-ar.js

All HTML files inside general_preview/ were patched to include these assets and to remove Variant-A/B includes.
