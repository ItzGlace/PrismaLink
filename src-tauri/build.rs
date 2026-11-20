fn main() {
    // Android devices with 16 KiB pages require compatible ELF LOAD alignment.
    // This also loads correctly on devices using 4 KiB pages.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("android") {
        println!("cargo:rustc-link-arg=-Wl,-z,max-page-size=16384");
    }
    tauri_build::build()
}
