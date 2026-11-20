# PrismaLink

An original, local-first connection workspace built with **Tauri 2, Rust, React, and TypeScript** for Android, Windows, and Linux. Charcoal surfaces, restrained violet glass, and lime highlights share one design system. “iOS 27 / iPhone 27” is an aesthetic reference, not a platform dependency.

**Status: 0.1.0-alpha.2 — incomplete but usable host manager and encrypted vault.** This is not yet a remote-access client. No published release is implied by this repository or workflow.

## What works

- First-run vault creation and unlocking; no account or server required.
- Encrypted local host and credential storage; random per-save salt/nonce, AES-256-GCM, PBKDF2-HMAC-SHA256 with 600,000 iterations.
- Add/edit/delete hosts, protocol labels, groups, tags, favorites, and search.
- Encrypted backup export, validated replacement restore, and wrong-password/tamper rejection.
- Five-minute inactivity lock. Master passwords stay in process memory while unlocked and are not persisted. JavaScript strings cannot be reliably zeroized.
- Native asynchronous DNS/TCP reachability checks with a five-second overall timeout.
- Native Ed25519 OpenSSH key generation. Private key downloads are **unencrypted**; protect them and set owner-only file permissions.
- Adaptive navigation, modal focus trapping/restoration, screen-reader labels, scalable text, reduced motion, reduced transparency, and low-effects mode.
- Explicit, temporary demo workspace; example hosts do not claim live status.

**Deferred:** interactive SSH and session tabs, SFTP browsing/transfers, VNC/RDP rendering, NFC, SSH authentication/trust management, traffic statistics, platform biometric unlock, and performance measurements. Their navigation pages state these limitations. TCP reachability does not establish SSH compatibility or server identity. No 60 fps claim is made.

## Develop

Use the existing checkout. Cloud tasks are already isolated; do not create another worktree unless requested.

Prerequisites: Node 24 with npm, Rust **1.90.0** (pinned by `rust-toolchain.toml`).

```sh
npm ci
npm run dev                 # UI in a local browser, native operations unavailable
npm run tauri dev           # native desktop application
npm run build
npm test
cargo test -p prismalink-core --locked
cargo fmt --all -- --check
cargo clippy -p prismalink-core --locked -- -D warnings
npx playwright install chromium
npm run test:ui
```

For a nonstandard Chromium install, set `CHROMIUM_PATH`. The local cloud test configuration uses `/usr/bin/chromium`; CI installs the Playwright-managed Chromium. Tests start their own local Vite process, not an external preview/test service.

Linux native prerequisites (Debian/Ubuntu): `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`. AppImage tooling may need `libfuse2`/`libfuse2t64`, or `APPIMAGE_EXTRACT_AND_RUN=1`. Building RPMs may require `rpm`. Install using your platform's supported package manager; do not disable signature or TLS checks.

Windows: Microsoft C++ build tools and WebView2, plus Rust's MSVC target. The NSIS installer uses Tauri's supported WebView2 bootstrapper. No Windows signing identity is configured; generated installers are **unsigned**.

Android: Android Studio/SDK, JDK 17 or 21, SDK platform 37.0 and build-tools 37.0.0, NDK 27.2.12479018, and Rust Android targets. See [building and release](docs/BUILDING.md).

## Data & security

The native WebView's local storage holds only the encrypted vault envelope. UI preferences are nonsecret and stored separately. There is no password recovery. Export an encrypted backup before clearing app data, uninstalling, restoring, or upgrading an alpha build. Restoring replaces the current data and reencrypts under the current master password.

This has not received an independent security audit. Browser code and the Rust core share a trust boundary through a restrictive Tauri CSP; native commands are restricted to the main local webview. No shell execution, arbitrary file reading, or remote frontend is enabled. Native exports use the system file picker and its selected-path permission scope. Clipboard content is not automatically cleared and may be visible to other applications. Never paste credentials into diagnostics or host notes.

No telemetry, external font requests, remote assets, or analytics are included. Fonts are bundled. Demo hosts use example.com and RFC 5737 documentation addresses.

## Distribution

The release workflow builds an Android universal APK, an unsigned Windows x64 NSIS `.exe`, and Linux x64 `.AppImage`, `.deb`, and `.rpm`. It fails closed on missing Android signing credentials and only publishes after required jobs pass. CI execution and actual package verification are separate from having a workflow checked in.

See [validation](docs/VALIDATION.md), [release notes](docs/RELEASE_NOTES.md), [design](docs/DESIGN.md), and [third-party notices](THIRD_PARTY_NOTICES.md). MIT licensed; dependencies retain their own licenses.
