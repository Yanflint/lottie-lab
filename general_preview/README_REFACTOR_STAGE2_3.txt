Refactor Stage 2 & 3 (general_preview-only)

Changes focused on mobile background & lottie visibility:
- assets/styles/components.css — helper classes (.lp-bg, .lp-lottie, .lp-has-bg)
- assets/styles/mobile.css — ::before padding now applies ONLY to .lp-has-bg (assigned by JS)
- assets/mobile-compat.js — detects background-image blocks, sets intrinsic aspect ratio & min-height;
  also ensures Lottie containers get a sensible min-height via data-ar or default (9/16).

All new files live under general_preview/assets/, and HTML in general_preview/ was patched to include them.
