# Project editing rules

- Change only the component, display, behavior, or content explicitly requested by the user.
- Never redesign, reorder, recolor, rewrite, hide, collapse, or remove unrelated parts of the application.
- Preserve established layout, spacing, colors, typography, copy, and behavior outside the requested scope.
- If a requested change appears to require altering another visible area, stop and ask before making that broader change.
- Treat the top `Wallet portfolio. One private view.` section, its ecosystem labels, its colors, and its address-entry layout as locked unless the user explicitly asks to change that section.
- Keep wallet addresses out of source code, fixtures, commits, GitHub Actions, screenshots, and logs. User-entered addresses must remain browser-local.
- All collapsible/fold-in-out panels (address panel, tracked wallets panel, new wallet panel, token detail panel) must be the same size: `max-width: 530px`, same padding, same border-radius.
