import fs from "node:fs";
import path from "node:path";
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const entries = [];
for (const [directory, info] of Object.entries(lock.packages)) {
  if (!directory || info.dev) continue;
  const metadata = JSON.parse(
    fs.readFileSync(path.join(directory, "package.json"), "utf8"),
  );
  const notices = fs
    .readdirSync(directory)
    .filter((name) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(name))
    .filter((name) => fs.statSync(path.join(directory, name)).isFile())
    .map((name) => ({
      name,
      text: fs.readFileSync(path.join(directory, name), "utf8"),
    }));
  entries.push({
    name: metadata.name,
    version: metadata.version,
    license: metadata.license || info.license || "SEE PACKAGE",
    integrity: info.integrity,
    repository: metadata.repository,
    notices,
  });
}
console.log(
  JSON.stringify(
    { format: "PrismaLink dependency notices v1", packages: entries },
    null,
    2,
  ),
);
