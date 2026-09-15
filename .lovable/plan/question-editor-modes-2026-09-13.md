# Question editor modes

## Changes
- Replace the current mixed feature checklist with three modes: **Simple editor** (selected by default), **Contains an equation**, and **Contains code**.
- Keep modes selectable together so a question can combine normal formatting, mathematics, and code.
- Show only the toolbar groups enabled by the selected modes.
- Add the requested mathematics tools: inline equation, power, subscript, square root, fraction, integral, limit, matrix, vector, Greek symbols, and operators/relations.
- Add code tools for inline code and fenced multi-line code.
- Add simple text tools for numbered list, bullet list, bold, and italic.
- Preserve the existing question fields and saving behavior; formatting remains stored in the existing text fields.
- Update learner/admin rich rendering so the added formatting syntax displays cleanly.

## Technical details
- Extend the editor insertion helper for cursor placement, selected-text wrapping, snippets, and symbol pickers.
- Use the existing shared buttons, checkboxes, dark-theme tokens, and live preview.
- Verify with the TypeScript checker and an admin-page browser render.
