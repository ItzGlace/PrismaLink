#!/usr/bin/env bash
# Source this file when using the prepared cloud snapshot. Never changes HOME.
if [ -d /workspace/tooling/cargo/bin ]; then
  export CARGO_HOME=/workspace/tooling/cargo
  export RUSTUP_HOME=/workspace/tooling/rustup
  export PATH="$CARGO_HOME/bin:$PATH"
fi
if [ -d /workspace/tooling/sysroot/usr/lib/x86_64-linux-gnu/pkgconfig ]; then
  export PKG_CONFIG_PATH="/workspace/tooling/sysroot/usr/lib/x86_64-linux-gnu/pkgconfig:/workspace/tooling/sysroot/usr/share/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
  export PKG_CONFIG_SYSROOT_DIR=/workspace/tooling/sysroot
  export LD_LIBRARY_PATH="/workspace/tooling/sysroot/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
  export PATH="/workspace/tooling/sysroot/usr/bin:$PATH"
fi
if [ -d /workspace/tooling/android-sdk ]; then
  export ANDROID_HOME=/workspace/tooling/android-sdk
  export ANDROID_USER_HOME=/workspace/tooling/android-user
  export NDK_HOME="$ANDROID_HOME/ndk/27.2.12479018"
  export GRADLE_USER_HOME=/workspace/tooling/gradle
  export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
  if [ -x /workspace/tooling/sysroot/usr/lib/jvm/java-21-openjdk-amd64/bin/javac ]; then
    export JAVA_HOME=/workspace/tooling/sysroot/usr/lib/jvm/java-21-openjdk-amd64
  fi
fi
export CARGO_BUILD_JOBS=2
export APPIMAGE_EXTRACT_AND_RUN=1

export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/workspace/tooling/cache}"
export XDG_DATA_HOME="${XDG_DATA_HOME:-/workspace/tooling/app-data}"
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-/workspace/tooling/app-config}"
