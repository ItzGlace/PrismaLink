# Shared design system

The UI is an original composition; it uses no Apple frameworks or invented platform APIs.

| Token | Value / behavior |
|---|---|
| Foundation | `#18181C` |
| Action/focus/selection | `#723BFA`; lighter outline for contrast |
| Selective highlight | `#B9F500`; no status communicated by color alone |
| Text | `#f1f0f5`, muted neutrals, supporting error pink |
| Typeface | Bundled DM Sans Variable / Manrope Variable; monospace diagnostics |
| Spacing | 4, 8, 12, 16, 20, 24, 32, 40 px family |
| Radius | 9–12 px controls, 15–18 px cards, 21–25 px dialogs/vault |
| Glass | Fine translucent borders, subtle inset edge, 24 px backdrop blur |
| Fallback | Solid `#25232c` via reduce transparency / low effects |
| Motion | 160–220 ms opacity/transform, interrupted by state changes |

Remote/terminal output surfaces are opaque. Glass is confined to surrounding cards, sidebar and dialogs. No continuous render loop or animated ambient backgrounds. System reduced-motion preference always disables transitions. Settings permit additional reduced motion, reduced transparency, low effects and larger text. Low effects disables background gradients, blur and shadows.

Below 800 px the sidebar becomes a navigation drawer behind a touch-sized menu control; below 500 px hosts use one column. Wide layouts use three columns and a fixed floating sidebar. All text remains selectable where practical; credentials are obscured by default. Icons are Lucide (ISC). App identity icon is an original vector in `src-tauri/app-icon.svg`.

Measured 60 fps is not established. Verify native WebView performance on representative Android and desktop hardware before making performance claims.
