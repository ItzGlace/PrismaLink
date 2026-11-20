//! Platform-independent native operations. No credentials are logged or transmitted.
use serde::Serialize;
use std::time::Instant;
use tokio::time::{timeout, Duration};

pub fn validate_address(address: &str, port: u16) -> Result<(), String> {
    if address.is_empty()
        || address.len() > 253
        || port == 0
        || address
            .chars()
            .any(|c| c.is_whitespace() || matches!(c, '/' | '\\' | '@'))
    {
        return Err("Enter a hostname or IP address and a port from 1 to 65535.".into());
    }
    Ok(())
}

/// Covers DNS resolution and connect under one timeout; never blocks the UI thread.
/// This tests TCP reachability, not server identity or protocol compatibility.
pub async fn probe(address: &str, port: u16) -> Result<String, String> {
    validate_address(address, port)?;
    let start = Instant::now();
    let socket = timeout(
        Duration::from_secs(5),
        tokio::net::TcpStream::connect((address, port)),
    )
    .await
    .map_err(|_| "Connection timed out after 5 seconds.".to_owned())?
    .map_err(|e| format!("TCP connection failed: {e}"))?;
    drop(socket);
    Ok(format!(
        "TCP reachable · {} ms (not authenticated)",
        start.elapsed().as_millis()
    ))
}

#[derive(Serialize)]
pub struct KeyPair {
    pub public_key: String,
    pub private_key: String,
}

pub fn generate_key() -> Result<KeyPair, String> {
    use ssh_key::{Algorithm, LineEnding, PrivateKey};
    let key =
        PrivateKey::random(&mut rand_core::OsRng, Algorithm::Ed25519).map_err(|e| e.to_string())?;
    Ok(KeyPair {
        public_key: key.public_key().to_openssh().map_err(|e| e.to_string())?,
        private_key: key
            .to_openssh(LineEnding::LF)
            .map_err(|e| e.to_string())?
            .to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_invalid_addresses_and_ports() {
        for address in [
            "",
            "https://host",
            "user@host",
            "host name",
            "host\n",
            "../host",
        ] {
            assert!(validate_address(address, 22).is_err(), "{address}");
        }
        assert!(validate_address("localhost", 0).is_err());
        assert!(validate_address("::1", 22).is_ok());
        assert!(validate_address("server.example.com", 65535).is_ok());
    }
    #[test]
    fn generated_keys_are_unique_and_roundtrip() {
        use ssh_key::PrivateKey;
        let a = generate_key().unwrap();
        let b = generate_key().unwrap();
        assert_ne!(a.public_key, b.public_key);
        let private = PrivateKey::from_openssh(&a.private_key).unwrap();
        assert_eq!(private.public_key().to_openssh().unwrap(), a.public_key);
        assert!(a.public_key.starts_with("ssh-ed25519 "));
    }
    #[tokio::test]
    async fn detects_live_listener_and_connection_refused() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        assert!(probe("127.0.0.1", port)
            .await
            .unwrap()
            .contains("not authenticated"));
        drop(listener);
        assert!(probe("127.0.0.1", port).await.is_err());
    }
}
