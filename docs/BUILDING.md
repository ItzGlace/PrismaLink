# Build and release

## Platforms

- Android: minimum API 24 (Android 7.0), with an up-to-date Android System WebView that supports WebCrypto. Selected ABIs: **arm64-v8a, armeabi-v7a, x86_64**. The universal APK must contain all three. i686 is not selected because current release device support does not require it. Emulator/device installation has not been verified in this cloud machine.
- Windows: x64, target Windows 10/11 with WebView2. Windows 10 is no longer generally serviced; this does not claim OS vendor support. Windows ARM and 32-bit are not release targets. CI uses Windows Server 2022 for installer/launch/uninstall checks; this is not a substitute for Windows 10/11 hardware testing.
- Linux: x64 with GTK 3, WebKitGTK 4.1, and compatible glibc. CI builds on Ubuntu 24.04; `.deb` targets Ubuntu 24.04 and compatible newer Debian systems, subject to actual tests. `.rpm` is experimental and is not a claim of Fedora/AlmaLinux compatibility. A local Debian 13 build needs Debian 13-level libraries. AppImage portability still depends on the host kernel, glibc, display stack, and WebKitGTK. Do not assume every distro works.

## Desktop packaging

```sh
npm ci
npm run tauri build -- --ci --bundles deb,rpm,appimage # Linux
npm run tauri build -- --ci --bundles nsis             # Windows
```

Packages are under `target/release/bundle`. Tauri supplies desktop integration and platform icons. Debian removal: `sudo apt remove prisma-link`. RPM removal: `sudo rpm -e prisma-link`. AppImage removal: delete the file and any manually added desktop shortcut. Uninstallation may leave the WebView data directory; export a backup before manually removing it.

## Android source and build

The Kotlin/Gradle Android project is retained in `src-tauri/gen/android`, including its wrapper. It embeds the same Rust core and local frontend. Build caches, machine-local paths, and generated target settings are ignored. After changing Rust plugins, run `npm run tauri android init -- --ci` to refresh generated glue and review changes.

```sh
export ANDROID_HOME=/path/to/android-sdk
export NDK_HOME="$ANDROID_HOME/ndk/27.2.12479018"
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
npm ci
npm run tauri android build -- --ci --apk --target aarch64 armv7 x86_64
```

Without `--split-per-abi`, the APK is universal. Release APKs are unsigned until signed using the existing app release key. Never replace an established key, commit a keystore, or call a debug certificate a production signature.

## Protected GitHub release environment

Create a GitHub environment named `release`. Supply these as protected Actions secrets, **not chat messages or repository files**:

- `ANDROID_KEYSTORE_BASE64`: base64 encoding of the owner's existing release keystore.
- `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

If this app has never had a release identity, the owner must create and securely retain its first release key outside the repository. Automation deliberately never generates a substitute. Windows code signing is optional for this prerelease and currently unavailable; release notes must retain the unsigned warning.

The final publish job alone gets `contents: write`; other jobs only read contents. Actions are pinned to commit SHAs resolved from upstream version tags. Gradle and plugin versions are pinned, and the Gradle distribution and wrapper have verified SHA-256 checksums. Cargo and npm dependencies are locked; npm installs use `npm ci`.

Update package versions consistently and commit all source, locks, docs, tests, and assets before creating `v0.1.0-alpha.5`. Push the release tag only when credentials and runner access are ready. `.github/workflows/release.yml` checks the tag/version match, builds and verifies packages, checks APK signatures and ABIs, archives the exact tag, emits SHA-256 checksums and provenance, adds npm CycloneDX and Rust dependency/license metadata, publishes a prerelease, then verifies returned asset names and sizes. GitHub creates download links on publication. Publication must not be claimed until that job and final asset verification succeed.

Workflows can be started manually to diagnose builds without publishing (`workflow_dispatch` on a branch). A source archive from `git archive` excludes credentials, ignored caches, and local data. There are no submodules. Frontend dependency notices and a Rust dependency graph accompany releases; a full combined native/system SBOM remains follow-up work.

## Prepared cloud snapshot

Run `source scripts/cloud-env.sh` to select the retained workspace-local Rust, full JDK, native headers/libraries, Android SDK, and writable caches. For Android on the managed proxy, use `python3 scripts/android-cloud.py`; this passes the inherited proxy host/port to Gradle without extracting credentials or disabling TLS verification. It uses the same build command and release ABIs as above. These helpers do not install Linux libraries into system directories: native GUI startup still requires a supported full GTK/WebKit installation or a representative runner. For AppImage packaging from this particular sysroot, clear `PKG_CONFIG_SYSROOT_DIR` for the **bundle-only** command, keeping it set for compilation; otherwise linuxdeploy incorrectly prefixes GTK module paths twice.

## Owner-signed artifact publication

When signing locally, `scripts/sign-android-local.py` reads the owner's keystore and passwords from protected files outside the checkout and verifies the public certificate against `release-signing.json`. It generates a signed universal APK and public source/checksum provenance. Never commit the keystore or password files.

The `Publish owner-signed prerelease` workflow supports the initial `v0.1.0-alpha.5` release without placing the private signing identity in CI. Its separate `release-artifacts/android-v0.1.0-alpha.5` branch contains only the final signed APK and public provenance; source archives from the release tag exclude this artifact branch. Push `release/publish-v0.1.0-alpha.5` at the release source commit after the signed artifact branch exists. The workflow verifies the exact tag/source commit, expected owner certificate, APK checksum, ABI and 16 KiB alignment. It reuses desktop artifacts only after the original source checks and native install/render/uninstall jobs passed for that exact commit, then runs the signed APK's emulator vault tests. Publication remains gated on all of these checks. Private repository visibility remains unchanged.
