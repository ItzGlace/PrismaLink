import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const password = "a secure testing password";
async function setup(page: any) {
  await page.goto("/");
  await page.getByLabel("Master password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create my vault" }).click();
  await expect(
    page.getByRole("heading", { name: "A place for every host." }),
  ).toBeVisible();
}
test("vault and host persistence, search, edit, favorites, lock and wrong password", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await page.getByLabel("Host name").fill("My server");
  await page.getByLabel("Hostname or IP").fill("localhost");
  await page.getByLabel("Username", { exact: true }).fill("test");
  await page.getByRole("button", { name: "Save host" }).click();
  await expect(
    page.getByRole("button", { name: "My server", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Favorite My server" }).click();
  await page.getByLabel("Search hosts").fill("missing");
  await expect(
    page.getByRole("button", { name: "My server", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Clear search").click();
  await page.getByRole("button", { name: "My server", exact: true }).click();
  await page.getByRole("button", { name: "Edit host" }).click();
  await page.getByLabel("Host name").fill("Renamed server");
  await page.getByRole("button", { name: "Save host" }).click();
  await expect(
    page.getByRole("button", { name: "Renamed server", exact: true }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    localStorage.getItem("prismalink-vault-v1"),
  );
  expect(stored).not.toContain("Renamed server");
  expect(stored).not.toContain("localhost");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page
    .getByLabel("Master password", { exact: true })
    .fill("incorrect password");
  await page.getByRole("button", { name: "Unlock workspace" }).click();
  await expect(page.getByRole("alert")).toContainText("Could not unlock");
  await page.getByLabel("Master password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Unlock workspace" }).click();
  await expect(
    page.getByRole("button", { name: "Renamed server", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lock workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
});
test("credential storage, encrypted export and restore", async ({ page }) => {
  await setup(page);
  await page.getByRole("button", { name: "Vault", exact: true }).click();
  await page.getByRole("button", { name: "Add credential" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Database");
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page.getByLabel("Password", { exact: true }).fill("sensitive-password");
  await page.getByRole("button", { name: "Save credential" }).click();
  await expect(page.getByRole("heading", { name: "Database" })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Backup & restore" }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export encrypted vault" }).click();
  const download = await dl;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByLabel("Choose encrypted backup").setInputFiles(path!);
  await page.getByLabel("Backup password").fill(password);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Verify & restore" }).click();
  await expect(page.getByRole("status")).toContainText("Vault restored");
  await page.getByRole("button", { name: "Vault", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Database" })).toBeVisible();
  const stored = await page.evaluate(() =>
    localStorage.getItem("prismalink-vault-v1"),
  );
  expect(stored).not.toContain("sensitive-password");
});
test("mismatching setup passwords and malformed import show errors", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Master password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill("different secure password");
  await page.getByRole("button", { name: "Create my vault" }).click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create my vault" }).click();
  await page.getByRole("button", { name: "Import / export" }).click();
  await page.getByLabel("Choose encrypted backup").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{broken"),
  });
  await page.getByLabel("Backup password").fill(password);
  await page.getByRole("button", { name: "Verify & restore" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});
for (const width of [360, 390, 768, 1024, 1440])
  test(`responsive layout and accessibility at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Make yourself at home." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/welcome-${width}.png`,
      fullPage: true,
    });
    const welcomeAxe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(welcomeAxe.violations).toEqual([]);
    await page.getByRole("button", { name: "Explore demo workspace" }).click();
    await expect(
      page.getByRole("button", { name: "Production gateway", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/hosts-${width}.png`,
      fullPage: true,
    });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    if (width < 800)
      await page.getByRole("button", { name: "Open navigation" }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("checkbox", { name: /Reduce transparency/ }).check();
    await page.getByRole("checkbox", { name: /Reduce motion/ }).check();
    await page.getByRole("checkbox", { name: /Larger text/ }).check();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
test("keyboard dialog focus and escape restore focus", async ({ page }) => {
  await setup(page);
  const add = page.getByRole("button", { name: "Add host", exact: true });
  await add.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  for (let i = 0; i < 15; i++) await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest("[role=dialog]"),
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(add).toBeFocused();
});
test("automatic lock clears the workspace after inactivity", async ({
  page,
}) => {
  await page.clock.install();
  await setup(page);
  await page.clock.fastForward(301000);
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A place for every host." }),
  ).toHaveCount(0);
});
test("all pages and dialogs fit a narrow landscape layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await setup(page);
  for (const name of [
    "Sessions",
    "Files",
    "Vault",
    "NFC tools",
    "Diagnostics",
    "Settings",
    "Hosts",
  ]) {
    await page
      .locator("nav")
      .getByRole("button", { name: new RegExp("^" + name) })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("button", { name: "Add host", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Host name").fill("landscape");
  await page.getByLabel("Hostname or IP").fill("192.0.2.1");
  await page.getByRole("button", { name: "Save host" }).click();
  await expect(
    page.getByRole("button", { name: "landscape", exact: true }),
  ).toBeVisible();
});
test("demo data is never saved and changes are isolated", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore demo workspace" }).click();
  await page.getByRole("button", { name: "Favorite Home assistant" }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("prismalink-vault-v1")),
  ).toBeNull();
  await page.getByRole("button", { name: "Exit demo" }).click();
  await setup(page);
  await expect(
    page.getByRole("button", { name: "Home assistant", exact: true }),
  ).toHaveCount(0);
});
test("corrupted vault and preferences never crash or offer to overwrite saved data", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("prismalink-vault-v1", "{broken encrypted data");
    localStorage.setItem("prismalink-preferences", "null");
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("It has been preserved");
  await expect(
    page.getByRole("button", { name: "Unlock workspace" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("prismalink-vault-v1")),
  ).toBe("{broken encrypted data");
  await page.getByRole("button", { name: "Explore demo workspace" }).click();
  await expect(
    page.getByRole("button", { name: "Production gateway", exact: true }),
  ).toBeVisible();
});
test("switching pages after scrolling starts the new page at its heading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 650 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore demo workspace" }).click();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Make it feel like you." }),
  ).toBeInViewport();
});
