# Validation record — 2026-11-20

This records executed checks, not a guarantee that every bug is absent. No external Windows/Linux preview test service was used.

## Passed in this cloud machine

- Production TypeScript/Vite build, including strict unused-variable checking.
- **17 Vitest tests**: authenticated encryption round trip, wrong password, ciphertext tampering, unique salts/nonces, short password and version rejection, malformed/duplicate data, invalid ports/addresses, and a backup larger than the JS argument-spread limit.
- **13 Playwright/Chromium tests**: vault create/unlock/lock/persistence, incorrect password, host create/edit/favorite/search, encrypted credential backup/restore, malformed backup rejection, focus trap/restoration/Escape, inactivity lock, demo isolation, landscape navigation/dialogs, and preservation of corrupted vault/preferences.
- WCAG A/AA axe scans of first-run and demo host-library pages at **360, 390, 768, 1024 and 1440 px**; zero reported violations in these scans. No horizontal overflow at those widths or in the tested larger-text/landscape layouts. This does not replace manual screen-reader testing.
- Visual inspection of generated desktop/phone screenshots in `docs/screenshots`.
- **3 Rust core tests**: address validation, generated Ed25519 private/public key correspondence and uniqueness, live local TCP listener and connection refusal.
- Rust formatting, core Clippy with warnings denied, native desktop `cargo check`, release version consistency, workflow `actionlint`, and `git diff --check`.
- `npm audit`: **zero vulnerabilities** after upgrading test/build tooling and removing an obsolete license generator.
- Verified upstream Gradle wrapper and distribution SHA-256; wrapper checksum is saved in the Android project.
- Linux x64 optimized binary compilation; `.deb` and `.rpm` package generation and Debian control metadata inspection. The initial Debian package is named `prisma-link` and includes GTK/WebKit dependencies.
- Android arm64 native Rust library cross-compilation with NDK 27.2.12479018.

## Outstanding platform validation

Native Linux startup initially failed because this machine has WebKit in a workspace sysroot, while WebKit expects helper processes at distribution installation paths. Local packaging and runtime diagnosis are ongoing; a compiled binary is not evidence of successful native UI behavior. AppImage packaging initially failed in linuxdeploy; do not distribute an unvalidated portable image.

Android universal APK assembly, signature/ABI verification, and device/emulator installation are not yet established. Only arm64 native compilation is currently confirmed. No release keystore is present in the local machine. GitHub Actions secret metadata cannot be inspected while the GitHub API is blocked.

Windows installer generation/install/launch/uninstall has not run here. The workflow provides Windows runner checks but their results must be inspected after execution. Fedora/AlmaLinux RPM installation and other representative Linux distributions are untested. No 60 fps or comprehensive native accessibility claim is made.

## Release status

No release tag or GitHub release has been published or verified. Git read access works; `api.github.com` requests are denied by the managed network. Network additions for `api.github.com` and `uploads.github.com` were saved to the environment draft, together with reusable install/start instructions; saving does not apply or publish them. Apply the environment settings before inspecting Actions permissions/signing requirements and completing release publication.

The alpha intentionally does not implement SSH/SFTP/VNC/RDP/NFC protocol engines. Their unavailable pages explain that status. Host labels and TCP reachability are not protocol sessions.
