import { describe, it, expect } from "vitest";
import {
  decrypt,
  encrypt,
  samples,
  validateData,
  validateHost,
} from "../src/vault";
describe("encrypted vault", () => {
  const password = "a very long test password";
  it("roundtrips without exposing plaintext", async () => {
    const e = await encrypt(samples, password);
    expect(JSON.stringify(e)).not.toContain("gateway");
    expect(await decrypt(e, password)).toEqual(samples);
  });
  it("rejects wrong passwords", async () => {
    await expect(
      decrypt(await encrypt(samples, password), "wrong password"),
    ).rejects.toThrow("Could not unlock");
  });
  it("rejects tampered ciphertext", async () => {
    const e = await encrypt(samples, password);
    e.ciphertext =
      (e.ciphertext[0] === "A" ? "B" : "A") + e.ciphertext.slice(1);
    await expect(decrypt(e, password)).rejects.toThrow();
  });
  it("uses different salts, nonces and ciphertext each time", async () => {
    const a = await encrypt(samples, password),
      b = await encrypt(samples, password);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
  it("rejects short passwords and unsupported versions", async () => {
    await expect(encrypt(samples, "short")).rejects.toThrow();
    await expect(decrypt({ version: 2 } as never, password)).rejects.toThrow(
      "version",
    );
  });
  it("rejects malformed backups and duplicates", () => {
    expect(() => validateData({ hosts: [] })).toThrow();
    expect(() =>
      validateData({ ...samples, hosts: [samples.hosts[0], samples.hosts[0]] }),
    ).toThrow("Duplicate");
    expect(() => validateData({ hosts: [], credentials: [{}] })).toThrow();
  });
  it.each([0, 65536, -1, 2.5, NaN])("rejects invalid port %s", (port) =>
    expect(() => validateHost({ ...samples.hosts[0], port })).toThrow(),
  );
  it.each(["https://host", "user@host", "host name", "../host", ""])(
    "rejects unsafe address %s",
    (address) =>
      expect(() => validateHost({ ...samples.hosts[0], address })).toThrow(),
  );
});
describe("large vault serialization", () => {
  it("backs up more than the JavaScript spread argument limit", async () => {
    const d = {
      hosts: Array.from({ length: 600 }, (_, i) => ({
        ...samples.hosts[0],
        id: String(i),
        note: "A long note ".repeat(30),
      })),
      credentials: [],
    };
    const e = await encrypt(d, "a long master password");
    expect((await decrypt(e, "a long master password")).hosts).toHaveLength(
      600,
    );
  });
});
