# Validation record — 2026-11-20

This records executed checks, not a guarantee that every bug is absent. No external Windows/Linux preview test service was used.

## Published alpha.5 verification

[v0.1.0-alpha.5](https://github.com/ItzGlace/PrismaLink/releases/tag/v0.1.0-alpha.5) was published from source commit `8be50f3687fada2e5d5754f54b6f0f2b9eb19473`. This completed record supersedes the outstanding items in the earlier build history below.

- Local checks passed: 17 Vitest tests, 3 Rust core tests, and 14 Playwright tests, including the page-scroll navigation regression. Responsive layouts and axe accessibility scans passed at the recorded widths.
- [Native source/desktop run 44763951980](https://github.com/ItzGlace/PrismaLink/actions/runs/44763951980): source checks passed; both Ubuntu 24.04 x64 and Windows Server 2022 x64 package builds and native install/render/uninstall checks passed. That run's separate Android job failed its missing-CI-secret preflight; its publish job was skipped. The independent owner-signed workflow below completed Android validation and publication.
- [Owner-signed publication run 44764941417](https://github.com/ItzGlace/PrismaLink/actions/runs/44764941417) passed both verification and publication. The universal production-signed APK installed on an API 35 Google APIs x86_64 emulator; real WebView vault creation, persistence across process restart, unlock, and uninstall passed. Android minimum API is 24; the APK includes arm64-v8a, armeabi-v7a, and x86_64. ZIP and native ELF 16 KiB alignment checks passed.
- The APK certificate SHA-256 is `8C:66:3E:BF:C2:4B:31:9E:F0:DD:E6:C5:23:73:39:97:E1:64:0F:18:96:BB:FE:6F:B3:4F:18:16:A3:53:2D:8D`, matching the owner's supplied identity. Signing occurred locally; no private signing files were committed or published.
- All 16 public release assets were downloaded again in this cloud workspace. Every entry in `SHA256SUMS` and every provenance size/hash matched; the downloaded APK passed signature, source/version, ZIP, ABI machine-type and 16 KiB alignment verification. The published exact-tag source archive contains none of the uploaded signing files.

Windows remains unsigned. Windows 10/11 hardware, physical Android devices (including 16 KiB-page devices), and Fedora/AlmaLinux or other Linux distributions were not tested. SSH/SFTP/VNC/RDP/NFC engines remain deferred. These checks do not establish that all possible visual or backend bugs are absent.

## Earlier build history

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
- Android native Rust cross-compilation for arm64-v8a, armeabi-v7a and x86_64 with NDK 27.2.12479018; universal APK ZIP integrity, exact ABI set, package/version and minimum API 24 inspection. The release APK is unsigned: signature verification correctly fails (no production-signing claim). ELF machine types match all three ABI labels; the final APK includes 808 Rust-license entries.

## Outstanding platform validation

Native Linux startup initially failed because this machine has WebKit in a workspace sysroot, while WebKit expects helper processes at distribution installation paths. A helper-path virtualization attempt produced a blank native window, so native UI behavior is not validated. AppImage packaging initially failed in linuxdeploy; clearing the sysroot prefix for bundle-only packaging corrected the GTK path issue, and an approximately 104 MB AppImage was generated. Final local artifacts are approximately 3.3 MiB (Debian), 3.4 MiB (RPM), and 103.8 MiB (AppImage), including original dependency notices. AppImage extraction verified the embedded ELF and Rust-license metadata. These are development build artifacts; installation and UI behavior must be verified on standard platform runners before release.

Android universal APK assembly and ABI/minimum-version checks passed. Device/emulator installation and signed-release verification remain unrun; there is no /dev/kvm or configured local emulator/device. The local APK is an unsigned approximately 21 MiB build, not an installable production package. No release keystore is present in the local machine. GitHub Actions secret metadata cannot be inspected while the GitHub API is blocked.

Windows installer generation/install/launch/uninstall has not run here. The workflow provides Windows OS-accessibility render checks, Linux AT-SPI render/navigation checks and Android emulator vault create/restart/unlock checks. These native scripts do not use a preview service; their platform-runner results must be inspected after execution. Fedora/AlmaLinux RPM installation and other representative Linux distributions are untested. No 60 fps or comprehensive native accessibility claim is made.

## Release status

No release tag or GitHub release has been published or verified. Git read access works; `api.github.com` requests are denied by the managed network. Network additions for `api.github.com` and `uploads.github.com` were saved to the environment draft, together with reusable install/start instructions; saving does not apply or publish them. Apply the environment settings before inspecting Actions permissions/signing requirements and completing release publication.

The alpha intentionally does not implement SSH/SFTP/VNC/RDP/NFC protocol engines. Their unavailable pages explain that status. Host labels and TCP reachability are not protocol sessions.

## Tag-triggered CI follow-up

The checks job and Linux desktop job for `v0.1.0-alpha.1` passed in GitHub Actions run 44746879171. Linux installation, actual native WebKit render, demo navigation and uninstall passed on Ubuntu 24.04; the cloud sysroot limitation does not reproduce on that runner. Windows generated its installer but failed the combined native verification step. Android SDK setup exited 127 before building. Publication was skipped.

The next attempt, `v0.1.0-alpha.2`, uses an explicit SDK manager path, dynamic NDK location, early signing-secret presence checks, and a Windows PowerShell native verification script with explicit installation location, render readiness polling and failure annotations. These fixes preserve the required install/render/uninstall and signing gates. Native results for this new tag must be verified before claiming publication.

## Signed Android candidate follow-up

The owner's supplied production identity was verified against its public certificate fingerprint without printing credentials. The v0.1.0-alpha.4 signed APK passed source, version, SHA-256, ABI and 16 KiB ELF/ZIP alignment checks. Its emulator created a vault and persisted it across restart; unlock automation then tried to tap an offscreen button whose accessibility bounds were zero. The test now scrolls to a visible, usable control. A separate real navigation defect was reproduced (the new page heading remained above the viewport after switching from a scrolled page) and fixed by resetting page scroll on navigation and lock/unlock. The regression test and all 14 browser tests passed locally. v0.1.0-alpha.5 contains these corrections and must pass the native publication workflow before release.
