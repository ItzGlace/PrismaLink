export type Host = {
  id: string;
  name: string;
  address: string;
  port: number;
  username: string;
  protocol: "SSH" | "SFTP" | "RDP" | "VNC";
  group: string;
  tags: string[];
  favorite: boolean;
  note: string;
};
export type Credential = {
  id: string;
  name: string;
  username: string;
  password: string;
};
export type Data = { hosts: Host[]; credentials: Credential[] };
export type Envelope = {
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
};
const encoder = new TextEncoder();
const b64 = (v: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < v.length; i += 8192)
    binary += String.fromCharCode(...v.subarray(i, i + 8192));
  return btoa(binary);
};
const un64 = (v: string) => Uint8Array.from(atob(v), (c) => c.charCodeAt(0));
export const emptyData = (): Data => ({ hosts: [], credentials: [] });
async function derive(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 600000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encrypt(data: Data, password: string): Promise<Envelope> {
  if (password.length < 12)
    throw Error("Use at least 12 characters for your master password.");
  validateData(data);
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(data)),
  );
  return {
    version: 1,
    salt: b64(salt),
    iv: b64(iv),
    ciphertext: b64(new Uint8Array(ciphertext)),
  };
}
export async function decrypt(
  envelope: Envelope,
  password: string,
): Promise<Data> {
  if (envelope.version !== 1) throw Error("Unsupported vault version.");
  try {
    const salt = un64(envelope.salt),
      iv = un64(envelope.iv);
    if (salt.length !== 16 || iv.length !== 12) throw Error();
    const key = await derive(password, salt);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      un64(envelope.ciphertext),
    );
    const data = JSON.parse(new TextDecoder().decode(plain));
    validateData(data);
    return data;
  } catch {
    throw Error("Could not unlock. Check your password or backup file.");
  }
}
export function validateHost(h: Host) {
  if (
    !h.id ||
    typeof h.id !== "string" ||
    !h.name?.trim() ||
    h.name.length > 120
  )
    throw Error("A host needs a name of 1–120 characters.");
  if (
    typeof h.address !== "string" ||
    !h.address.trim() ||
    /[\s/\\@]/.test(h.address) ||
    h.address.length > 253
  )
    throw Error("Enter a hostname or IP address without a scheme or path.");
  if (!Number.isInteger(h.port) || h.port < 1 || h.port > 65535)
    throw Error("Port must be between 1 and 65535.");
  if (!["SSH", "SFTP", "RDP", "VNC"].includes(h.protocol))
    throw Error("Unsupported protocol.");
  if (
    typeof h.username !== "string" ||
    typeof h.group !== "string" ||
    typeof h.note !== "string" ||
    typeof h.favorite !== "boolean" ||
    !Array.isArray(h.tags) ||
    h.tags.some((t) => typeof t !== "string")
  )
    throw Error("Invalid host fields.");
}
export function validateData(value: unknown): asserts value is Data {
  if (!value || typeof value !== "object") throw Error("Invalid backup.");
  const d = value as Data;
  if (
    !Array.isArray(d.hosts) ||
    !Array.isArray(d.credentials) ||
    d.hosts.length > 10000 ||
    d.credentials.length > 10000
  )
    throw Error("Invalid or oversized backup.");
  const ids = new Set<string>();
  d.hosts.forEach((h) => {
    validateHost(h);
    if (ids.has(h.id)) throw Error("Duplicate host IDs.");
    ids.add(h.id);
  });
  const credentialIds = new Set<string>();
  d.credentials.forEach((c) => {
    if (
      !c.id ||
      typeof c.id !== "string" ||
      credentialIds.has(c.id) ||
      typeof c.name !== "string" ||
      typeof c.username !== "string" ||
      typeof c.password !== "string"
    )
      throw Error("Invalid credentials.");
    credentialIds.add(c.id);
  });
}
export const samples: Data = {
  hosts: [
    {
      id: "sample-1",
      name: "Production gateway",
      address: "gateway.example.com",
      port: 22,
      username: "deploy",
      protocol: "SSH",
      group: "Production",
      tags: ["gateway", "linux"],
      favorite: true,
      note: "Example host. Replace with your own connection details.",
    },
    {
      id: "sample-2",
      name: "Design workstation",
      address: "192.0.2.24",
      port: 3389,
      username: "alex",
      protocol: "RDP",
      group: "Workspace",
      tags: ["windows"],
      favorite: true,
      note: "Example host; remote desktop is not implemented in this alpha.",
    },
    {
      id: "sample-3",
      name: "Media server",
      address: "192.0.2.18",
      port: 22,
      username: "admin",
      protocol: "SFTP",
      group: "Homelab",
      tags: ["storage", "linux"],
      favorite: false,
      note: "Example host; file transfers are not implemented in this alpha.",
    },
    {
      id: "sample-4",
      name: "Development box",
      address: "192.0.2.42",
      port: 22,
      username: "developer",
      protocol: "SSH",
      group: "Workspace",
      tags: ["development"],
      favorite: false,
      note: "Example host.",
    },
    {
      id: "sample-5",
      name: "Home assistant",
      address: "192.0.2.8",
      port: 5900,
      username: "admin",
      protocol: "VNC",
      group: "Homelab",
      tags: ["automation"],
      favorite: false,
      note: "Example host.",
    },
  ],
  credentials: [],
};
