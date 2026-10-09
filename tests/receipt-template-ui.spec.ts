import { expect, test, type Page } from "@playwright/test";

const SETTINGS_PATH = "/keuangan/pengaturan-kuitansi";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function login(page: Page) {
  const email =
    process.env.E2E_ADMIN_EMAIL ?? requireEnv("SEED_ADMIN_EMAIL");
  const password =
    process.env.E2E_ADMIN_PASSWORD ?? requireEnv("SEED_ADMIN_PASSWORD");

  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).not.toHaveURL("/login");
}

async function openBuilderDialog(page: Page) {
  await page.goto(SETTINGS_PATH);
  await page.getByRole("button", { name: "Buat Template Baru" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Buat Template Bukti Pembayaran");
  return dialog;
}

test.describe("Visual Builder Template Kuitansi", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("dialog memuat dan menutup tanpa error", async ({ page }) => {
    const dialog = await openBuilderDialog(page);
    await expect(dialog.getByRole("button", { name: "Simpan & Terapkan Template" })).toBeEnabled();

    await dialog.getByRole("button", { name: "Batal" }).click();
    await expect(dialog).toBeHidden();
  });

  test("field nama & footer punya id stabil", async ({ page }) => {
    const dialog = await openBuilderDialog(page);

    const nameField = dialog.locator("#receipt-template-name-field");
    await expect(nameField).toBeVisible();
    await expect(nameField).toHaveValue("Kuitansi SPP & Kegiatan");
    await expect(dialog.locator("#receipt-template-name-label")).toContainText("Nama Template:");

    const footerField = dialog.locator("#receipt-template-footer-field");
    await expect(footerField).toBeVisible();
    await expect(footerField).not.toBeEmpty();
    await expect(dialog.locator("#receipt-template-footer-label")).toContainText("Catatan Kaki Resmi");
  });

  test("nama template dapat diubah", async ({ page }) => {
    const dialog = await openBuilderDialog(page);
    const nameField = dialog.locator("#receipt-template-name-field");

    await nameField.fill("Kuitansi Ujian 2025");
    await expect(nameField).toHaveValue("Kuitansi Ujian 2025");
  });

  test("catatan kaki dapat diubah", async ({ page }) => {
    const dialog = await openBuilderDialog(page);
    const footerField = dialog.locator("#receipt-template-footer-field");

    await footerField.fill("Disclaimer khusus untuk pengujian.");
    await expect(footerField).toHaveValue("Disclaimer khusus untuk pengujian.");
  });

  test("perubahan panel kontrol langsung tampil di pratinjau", async ({ page }) => {
    const dialog = await openBuilderDialog(page);
    const preview = dialog.locator("article");
    const noKuitansiTag = dialog.getByRole("button", { name: "No. Kuitansi" });

    await expect(preview).toContainText("No. Kuitansi");

    await noKuitansiTag.click();
    await expect(preview).not.toContainText("No. Kuitansi");

    await noKuitansiTag.click();
    await expect(preview).toContainText("No. Kuitansi");
  });

  test("pratinjau mengikuti ukuran kertas yang dipilih", async ({ page }) => {
    const dialog = await openBuilderDialog(page);

    await dialog.getByRole("button", { name: "A4 2-Rangkap" }).click();
    await expect(dialog.locator("text=A4 2-Rangkap").first()).toHaveCSS("border-color", "rgb(24, 87, 67)");
  });
});
