#[tauri::command]
async fn probe(address: String, port: u16) -> Result<String, String> {
    prismalink_core::probe(&address, port).await
}
#[tauri::command]
async fn generate_key() -> Result<prismalink_core::KeyPair, String> {
    tauri::async_runtime::spawn_blocking(prismalink_core::generate_key)
        .await
        .map_err(|e| e.to_string())?
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![probe, generate_key])
        .run(tauri::generate_context!())
        .expect("PrismaLink could not start");
}
