"""Use the managed HTTPS proxy for Gradle without changing proxy credentials or TLS trust.

Source scripts/cloud-env.sh first. On a normal workstation the proxy configuration
is omitted when HTTPS_PROXY is unset. No proxy values or environment dumps are logged.
"""
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlparse


def main():
    environment = os.environ.copy()
    proxy = urlparse(environment.get("HTTPS_PROXY") or environment.get("https_proxy", ""))
    if proxy.hostname:
        flags = " ".join(
            f"-D{scheme}.proxy{field}={value}"
            for scheme in ("http", "https")
            for field, value in (("Host", proxy.hostname), ("Port", proxy.port or 80))
        )
        environment["GRADLE_OPTS"] = environment.get("GRADLE_OPTS", "") + " " + flags
    arguments = sys.argv[1:] or ["--ci", "--apk", "--target", "aarch64", "armv7", "x86_64"]
    return subprocess.call(
        ["npm", "run", "tauri", "android", "build", "--", *arguments],
        cwd=Path(__file__).resolve().parent.parent,
        env=environment,
    )


if __name__ == "__main__":
    raise SystemExit(main())
