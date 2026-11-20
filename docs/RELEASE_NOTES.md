# PrismaLink 0.1.0-alpha.4

An early, incomplete but usable local host library and encrypted credential vault, with an original charcoal/violet/lime glass interface.

Implemented: vault setup/unlock/inactivity lock, host CRUD/search/groups/tags/favorites, credential storage, encrypted backup/restore, native TCP reachability diagnostics, native Ed25519 key generation, responsive navigation, keyboard dialog handling, and accessibility/effects settings.

Deferred: interactive SSH, SFTP transfers, VNC/RDP, NFC, biometric integration and advanced authentication. These protocols are not represented as working. TCP checks do not authenticate a remote server.

Validation: unit and local Chromium functional/accessibility/layout tests are recorded in `docs/VALIDATION.md`. Native packaging automation provides additional runner validation when it executes successfully. No external Windows/Linux preview test service is used. Android hardware/emulator installation and representative Linux distribution coverage remain unverified until explicitly recorded. No measured 60 fps claim.

Windows installers are unsigned. Android release APKs require the owner's established release signing identity. Private key exports are unencrypted. Alpha storage is not independently audited; retain encrypted backups. Source archives and provenance identify the exact release commit. Review SHA256SUMS before installing.
